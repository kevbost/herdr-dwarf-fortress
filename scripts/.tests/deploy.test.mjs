import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { baseline, collect, deploy } from "../deploy-to-herdr.mjs";

const SCRIPT = resolve(import.meta.dirname, "..", "deploy-to-herdr.mjs");

async function put(root, rel, text) {
  await mkdir(dirname(join(root, rel)), { recursive: true });
  await writeFile(join(root, rel), text);
}
const read = (root, rel) => readFile(join(root, rel), "utf8");
const exists = (root, rel) => stat(join(root, rel)).then(() => true, () => false);

// A repo and a home that start identical, with a baseline recorded.
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "df-deploy-"));
  const repo = join(dir, "repo");
  const home = join(dir, "home");
  const files = {
    "layouts/df-classic.json": '{"menu":"left"}\n',
    "themes/df-classic.json": "{}\n",
    "mods/df-classic/main.js": "export default 1;\n",
    "mods/df-classic/art/a.txt": "a\n",
  };
  for (const [rel, text] of Object.entries(files)) {
    await put(repo, rel, text);
    await put(home, rel, text);
  }
  await mkdir(join(home, "layouts"), { recursive: true });
  await baseline(repo, home);
  return { dir, repo, home, done: () => rm(dir, { recursive: true, force: true }) };
}

test("a deploy with nothing to do changes nothing", async () => {
  const f = await fixture();
  try {
    const plan = await deploy(f.repo, f.home);
    assert.deepEqual([plan.write, plan.remove, plan.conflicts], [[], [], []]);
  } finally {
    await f.done();
  }
});

test("a repo edit is deployed, and a second deploy is a no-op", async () => {
  const f = await fixture();
  try {
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    const plan = await deploy(f.repo, f.home);
    assert.deepEqual(plan.write, ["mods/df-classic/main.js"]);
    assert.equal(await read(f.home, "mods/df-classic/main.js"), "export default 2;\n");
    assert.deepEqual((await deploy(f.repo, f.home)).write, []);
  } finally {
    await f.done();
  }
});

test("a new repo file and a repo deletion are deployed", async () => {
  const f = await fixture();
  try {
    await put(f.repo, "mods/df-classic/new.js", "new\n");
    await rm(join(f.repo, "mods/df-classic/art/a.txt"));
    const plan = await deploy(f.repo, f.home);
    assert.deepEqual(plan.write, ["mods/df-classic/new.js"]);
    assert.deepEqual(plan.remove, ["mods/df-classic/art/a.txt"]);
    assert.equal(await exists(f.home, "mods/df-classic/new.js"), true);
    assert.equal(await exists(f.home, "mods/df-classic/art/a.txt"), false);
  } finally {
    await f.done();
  }
});

test("a live-only change (the menu side) survives while the repo copy is unchanged", async () => {
  const f = await fixture();
  try {
    await put(f.home, "layouts/df-classic.json", '{"menu":"right"}\n');
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    const plan = await deploy(f.repo, f.home);
    assert.deepEqual(plan.write, ["mods/df-classic/main.js"]);
    assert.equal(await read(f.home, "layouts/df-classic.json"), '{"menu":"right"}\n');
  } finally {
    await f.done();
  }
});

test("a file changed on both sides is a conflict and nothing is written", async () => {
  const f = await fixture();
  try {
    await put(f.repo, "layouts/df-classic.json", '{"menu":"left","x":1}\n');
    await put(f.home, "layouts/df-classic.json", '{"menu":"right"}\n');
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    const plan = await deploy(f.repo, f.home);
    assert.deepEqual(plan.conflicts.map((c) => c.path), ["layouts/df-classic.json"]);
    assert.equal(await read(f.home, "layouts/df-classic.json"), '{"menu":"right"}\n');
    // the other file in the same run still goes out
    assert.equal(await read(f.home, "mods/df-classic/main.js"), "export default 2;\n");
  } finally {
    await f.done();
  }
});

test("a repo deletion of a file changed live is a conflict", async () => {
  const f = await fixture();
  try {
    await rm(join(f.repo, "mods/df-classic/art/a.txt"));
    await put(f.home, "mods/df-classic/art/a.txt", "edited live\n");
    const plan = await deploy(f.repo, f.home);
    assert.equal(plan.conflicts.length, 1);
    assert.equal(await exists(f.home, "mods/df-classic/art/a.txt"), true);
  } finally {
    await f.done();
  }
});

test("what Herdr owns in the mod folder is never touched, and the gallery files never go out", async () => {
  const f = await fixture();
  try {
    await put(f.home, "mods/df-classic/jsconfig.json", "live\n");
    await put(f.home, "mods/df-classic/gpui-kit.d.ts", "live\n");
    await put(f.home, "mods/df-classic/main.js.error", "live\n");
    await put(f.home, "mods/df-classic/art/.wiki-cache/x", "live\n");
    await put(f.repo, "mods/df-classic/RECIPE.md", "recipe\n");
    await put(f.repo, "mods/df-classic/preview.png", "png\n");
    await put(f.repo, "mods/df-classic/preview-bigmap.png", "png\n");
    await put(f.repo, "mods/df-classic/.DS_Store", "junk\n");
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    await deploy(f.repo, f.home);
    for (const rel of ["jsconfig.json", "gpui-kit.d.ts", "main.js.error", "art/.wiki-cache/x"]) {
      assert.equal(await read(f.home, `mods/df-classic/${rel}`), "live\n", rel);
    }
    for (const rel of ["RECIPE.md", "preview.png", "preview-bigmap.png", ".DS_Store"]) {
      assert.equal(await exists(f.home, `mods/df-classic/${rel}`), false, rel);
    }
    assert.deepEqual(await collect(f.repo), [
      "layouts/df-classic.json",
      "mods/df-classic/art/a.txt",
      "mods/df-classic/main.js",
      "themes/df-classic.json",
    ]);
  } finally {
    await f.done();
  }
});

test("the file mode is kept and no temp file is left behind", async () => {
  const f = await fixture();
  try {
    await put(f.repo, "mods/df-classic/tools/run.sh", "#!/bin/sh\n");
    await chmod(join(f.repo, "mods/df-classic/tools/run.sh"), 0o755);
    await deploy(f.repo, f.home);
    assert.equal((await stat(join(f.home, "mods/df-classic/tools/run.sh"))).mode & 0o777, 0o755);
    const leftovers = spawnSync("find", [f.home, "-name", "*.deploy-tmp"], { encoding: "utf8" }).stdout;
    assert.equal(leftovers.trim(), "");
  } finally {
    await f.done();
  }
});

test("baseline refuses when the two copies differ", async () => {
  const f = await fixture();
  try {
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    await assert.rejects(baseline(f.repo, f.home), /differ[\s\S]*mods\/df-classic\/main\.js/);
  } finally {
    await f.done();
  }
});

test("a missing Herdr home is an error, not a silent no-op", async () => {
  const f = await fixture();
  try {
    await assert.rejects(deploy(f.repo, join(f.dir, "nowhere")), /no Herdr home/);
  } finally {
    await f.done();
  }
});

test("a lock held by another deploy is waited for, then given up", async () => {
  const f = await fixture();
  process.env.DEPLOY_LOCK_WAIT_MS = "400";
  try {
    await mkdir(join(f.repo, ".deploy-state", "lock"));
    const started = Date.now();
    await assert.rejects(deploy(f.repo, f.home), /another deploy holds/);
    assert.ok(Date.now() - started >= 300, "waited");
  } finally {
    delete process.env.DEPLOY_LOCK_WAIT_MS;
    await f.done();
  }
});

test("a stale lock (a killed deploy) is taken over", async () => {
  const f = await fixture();
  try {
    const lock = join(f.repo, ".deploy-state", "lock");
    await mkdir(lock);
    const old = new Date(Date.now() - 120_000);
    await utimes(lock, old, old);
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    assert.deepEqual((await deploy(f.repo, f.home)).write, ["mods/df-classic/main.js"]);
    assert.equal(await exists(f.repo, ".deploy-state/lock"), false);
  } finally {
    await f.done();
  }
});

test("a repo that lost the layout, theme or mod entry deploys nothing and deletes nothing", async () => {
  const f = await fixture();
  try {
    await rm(join(f.repo, "mods/df-classic"), { recursive: true });
    await assert.rejects(deploy(f.repo, f.home), /no mods\/df-classic\/main\.js/);
    assert.equal(await exists(f.home, "mods/df-classic/main.js"), true);
    assert.equal(await exists(f.home, "mods/df-classic/art/a.txt"), true);
  } finally {
    await f.done();
  }
});

test("a corrupt baseline is an error that says how to recover", async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.repo, ".deploy-state", "base.json"), "not json");
    await assert.rejects(deploy(f.repo, f.home), /baseline command/);
  } finally {
    await f.done();
  }
});

test("a baseline entry that points outside the home is refused", async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.repo, ".deploy-state", "base.json"), JSON.stringify({ files: { "../escape.txt": "x" } }));
    await assert.rejects(deploy(f.repo, f.home), /outside/);
  } finally {
    await f.done();
  }
});

test("the temp name a crashed deploy could leave is neither collected nor a baseline difference", async () => {
  const f = await fixture();
  try {
    await put(f.home, "mods/df-classic/.main.js.deploy-tmp", "half\n");
    assert.ok(!(await collect(f.home)).some((rel) => rel.endsWith(".deploy-tmp")));
    await baseline(f.repo, f.home);
  } finally {
    await f.done();
  }
});

test("concurrent deploys leave a valid baseline and write each change once", async () => {
  const f = await fixture();
  try {
    await put(f.repo, "mods/df-classic/main.js", "export default 2;\n");
    const [a, b] = await Promise.all([deploy(f.repo, f.home), deploy(f.repo, f.home)]);
    assert.equal(a.write.length + b.write.length, 1);
    JSON.parse(await read(f.repo, ".deploy-state/base.json"));
  } finally {
    await f.done();
  }
});

test("the command line: exit 0 and silent when idle, exit 2 on a conflict", async () => {
  const f = await fixture();
  try {
    const { NODE_TEST_CONTEXT, ...clean } = process.env; // a child of the test runner would not behave like a plain run
    const env = { ...clean, HERDR_APP_HOME: f.home };
    // the CLI resolves the repo from its own location, so it deploys this repo into the temp home:
    // run it against a copy of the scripts folder placed in the temp repo instead
    await mkdir(join(f.repo, "scripts"), { recursive: true });
    for (const name of ["deploy-to-herdr.mjs", "deploy-plan.mjs"]) {
      await writeFile(join(f.repo, "scripts", name), await readFile(join(dirname(SCRIPT), name)));
    }
    const idle = spawnSync("node", [join(f.repo, "scripts/deploy-to-herdr.mjs")], { env, encoding: "utf8" });
    assert.equal(idle.status, 0);
    assert.equal(idle.stdout + idle.stderr, "");
    await put(f.repo, "layouts/df-classic.json", '{"menu":"left","x":1}\n');
    await put(f.home, "layouts/df-classic.json", '{"menu":"right"}\n');
    const clash = spawnSync("node", [join(f.repo, "scripts/deploy-to-herdr.mjs")], { env, encoding: "utf8" });
    assert.equal(clash.status, 2);
    assert.match(clash.stderr, /conflict: layouts\/df-classic\.json/);
    const bad = spawnSync("node", [join(f.repo, "scripts/deploy-to-herdr.mjs"), "nope"], { env, encoding: "utf8" });
    assert.equal(bad.status, 1);
  } finally {
    await f.done();
  }
});
