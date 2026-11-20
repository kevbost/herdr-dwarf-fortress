#!/usr/bin/env node
// Copy the layout, theme and mod from this repo into the Herdr home, so Herdr's
// hot reload shows a repo change at once.
//
//   node scripts/deploy-to-herdr.mjs            deploy (the default)
//   node scripts/deploy-to-herdr.mjs baseline   record "repo and home are the same" (refuses if they differ)
//
// A file is written only when the repo copy changed since the last deploy, and a
// file changed on both sides is a conflict: nothing is overwritten (exit 2). What
// the last deploy left is kept in .deploy-state/base.json (git-ignored), never in
// the Herdr home. Prints nothing when there is nothing to do.
// HERDR_APP_HOME picks another home (default ~/.config/herdr-app).
import { createHash } from "node:crypto";
import { realpathSync, rmSync } from "node:fs";
import { chmod, copyFile, mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { planDeploy } from "./deploy-plan.mjs";

const NAME = "df-classic";
const MOD = `mods/${NAME}`;
const SINGLES = [`layouts/${NAME}.json`, `layouts/${NAME}.png`, `themes/${NAME}.json`];
const LOCK_STALE_MS = 60_000;
const LOCK_WAIT_MS = 5_000; // DEPLOY_LOCK_WAIT_MS overrides it (the tests do)
// A layout is not deployed from a repo that has lost one of these (an old checkout, a stash): it would delete the running layout.
const CORE = [`layouts/${NAME}.json`, `themes/${NAME}.json`, `${MOD}/main.js`];

// Left out, as install-to-herdr.sh and sync-from-herdr.sh leave them out: what Herdr
// writes into a mod folder, caches, and the gallery files (they stay in the repo).
const skipFile = (name) =>
  name === ".DS_Store" ||
  name === "jsconfig.json" ||
  name === "gpui-kit.d.ts" ||
  name === "RECIPE.md" ||
  name.endsWith(".error") ||
  name.endsWith(".deploy-tmp") ||
  /^preview.*\.png$/.test(name);
const skipDir = (rel) => basename(rel) === "__pycache__" || rel === `${MOD}/art/.wiki-cache`;

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const missing = (error) => error.code === "ENOENT" || error.code === "ENOTDIR";
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// A path from a listing or from the baseline file must stay inside its root.
function inside(root, rel) {
  const full = resolve(root, rel);
  if (!full.startsWith(resolve(root) + sep)) throw new Error(`refusing a path outside ${root}: ${rel}`);
  return full;
}

/** Sorted relative paths (posix style) of everything deployable under root. */
export async function collect(root) {
  const found = [];
  for (const rel of SINGLES) {
    try {
      if ((await stat(join(root, rel))).isFile()) found.push(rel);
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  async function walk(rel) {
    let entries;
    try {
      entries = await readdir(join(root, rel), { withFileTypes: true });
    } catch (error) {
      if (missing(error)) return;
      throw error;
    }
    for (const entry of entries) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!skipDir(child)) await walk(child);
      } else if (entry.isFile() && !skipFile(entry.name)) {
        found.push(child);
      }
    }
  }
  await walk(MOD);
  return found.sort();
}

/** { path: hash } for the paths that exist under root. */
async function hashPaths(root, paths) {
  const hashes = {};
  for (const rel of paths) {
    try {
      hashes[rel] = sha(await readFile(inside(root, rel)));
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  return hashes;
}

const baseFile = (repo) => join(repo, ".deploy-state", "base.json");

async function readBase(repo) {
  try {
    const parsed = JSON.parse(await readFile(baseFile(repo), "utf8"));
    if (!parsed || typeof parsed.files !== "object" || parsed.files === null) throw new Error("no files object");
    return parsed.files;
  } catch (error) {
    if (missing(error)) return {};
    throw new Error(`cannot read ${baseFile(repo)} (${error.message}); run the baseline command after checking the two copies match`);
  }
}

async function writeBase(repo, files) {
  const file = baseFile(repo);
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify({ files }, null, 2)}\n`);
  await rename(tmp, file);
}

// Two hooks can fire close together: one deploy at a time.
async function withLock(repo, work) {
  const state = join(repo, ".deploy-state");
  const lock = join(state, "lock");
  await mkdir(state, { recursive: true });
  const giveUp = Date.now() + Number(process.env.DEPLOY_LOCK_WAIT_MS ?? LOCK_WAIT_MS);
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let age;
      try {
        age = Date.now() - (await stat(lock)).mtimeMs;
      } catch (statError) {
        if (missing(statError)) continue;
        throw statError;
      }
      if (age > LOCK_STALE_MS) await rm(lock, { recursive: true, force: true });
      else if (Date.now() > giveUp) throw new Error(`another deploy holds ${lock}`);
      else await sleep(100);
    }
  }
  // A hook killed at its timeout must not leave the lock behind.
  const onSignal = () => {
    rmSync(lock, { recursive: true, force: true });
    process.exit(1);
  };
  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);
  try {
    return await work();
  } finally {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
    await rm(lock, { recursive: true, force: true });
  }
}

// Mod first, then theme, then layout, so a layout never names a mod that is not there yet.
const rank = (rel) => (rel.startsWith("mods/") ? 0 : rel.startsWith("themes/") ? 1 : 2);
const byRank = (a, b) => rank(a) - rank(b) || a.localeCompare(b);

// The hidden temp name is not watched by Herdr; the rename is the one save it sees.
async function place(repo, home, rel) {
  const from = inside(repo, rel);
  const to = inside(home, rel);
  await mkdir(dirname(to), { recursive: true });
  const tmp = join(dirname(to), `.${basename(to)}.deploy-tmp`);
  await copyFile(from, tmp);
  await chmod(tmp, (await stat(from)).mode & 0o777);
  await rename(tmp, to);
}

/** Deploy repo -> home. Returns the plan that was applied. */
export async function deploy(repo, home) {
  try {
    await stat(join(home, "layouts"));
  } catch {
    throw new Error(`no Herdr home at ${home} (set HERDR_APP_HOME)`);
  }
  return withLock(repo, async () => {
    const paths = await collect(repo);
    const base = await readBase(repo);
    const repoHashes = await hashPaths(repo, paths);
    const lost = CORE.filter((rel) => repoHashes[rel] === undefined && base[rel] !== undefined);
    if (lost.length > 0) {
      throw new Error(`the repo has no ${lost.join(", ")}, so nothing was deployed (an old checkout or a stash?). Deploying would delete it from the Herdr home.`);
    }
    const liveHashes = await hashPaths(home, [...new Set([...paths, ...Object.keys(base)])]);
    const plan = planDeploy({ repo: repoHashes, live: liveHashes, base });
    let changed = false;
    try {
      for (const rel of [...plan.write].sort(byRank)) {
        await place(repo, home, rel);
        base[rel] = repoHashes[rel];
        changed = true;
      }
      for (const rel of plan.record) {
        base[rel] = repoHashes[rel];
        changed = true;
      }
      for (const rel of plan.remove) {
        await unlink(inside(home, rel));
        delete base[rel];
        changed = true;
      }
      for (const rel of plan.forget) {
        delete base[rel];
        changed = true;
      }
    } finally {
      if (changed) await writeBase(repo, base);
    }
    return plan;
  });
}

/** Record that repo and home hold the same files; refuse if they do not. */
export async function baseline(repo, home) {
  return withLock(repo, async () => {
    const repoPaths = await collect(repo);
    const livePaths = await collect(home);
    const repoHashes = await hashPaths(repo, repoPaths);
    const liveHashes = await hashPaths(home, livePaths);
    const differ = [...new Set([...repoPaths, ...livePaths])]
      .filter((rel) => repoHashes[rel] !== liveHashes[rel])
      .sort();
    if (differ.length > 0) {
      throw new Error(`repo and Herdr home differ, so no baseline was recorded:\n  ${differ.join("\n  ")}`);
    }
    await writeBase(repo, repoHashes);
    return repoPaths.length;
  });
}

async function main(argv) {
  const command = argv[2] ?? "deploy";
  const repo = resolve(import.meta.dirname, "..");
  const home = process.env.HERDR_APP_HOME || join(homedir(), ".config", "herdr-app");
  if (command === "baseline") {
    const count = await baseline(repo, home);
    console.log(`baseline recorded for ${count} files`);
    return 0;
  }
  if (command !== "deploy") {
    console.error(`unknown command "${command}": use deploy or baseline`);
    return 1;
  }
  const plan = await deploy(repo, home);
  for (const rel of plan.write) console.log(`deployed ${rel}`);
  for (const rel of plan.remove) console.log(`removed ${rel}`);
  for (const { path, reason } of plan.conflicts) console.error(`conflict: ${path}: ${reason}`);
  if (plan.conflicts.length > 0) {
    console.error("nothing was overwritten there. To keep the repo copy: copy it over the Herdr home file (cp), and the next deploy records it.");
    console.error("To keep the Herdr home copy: commit or stash the repo change, then run scripts/sync-from-herdr.sh (it pulls the whole mod folder from the home).");
    return 2;
  }
  return 0;
}

// realpath: node reports the main module by its real path, argv[1] keeps a symlinked one (/var, /tmp)
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`deploy failed: ${error.message}`);
      process.exit(1);
    },
  );
}
