import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const REAL_REPO = resolve(import.meta.dirname, "..", "..");

// A throwaway repo that holds a copy of one script, because the scripts find their repo from where they sit.
async function sandbox(...scripts) {
  const repo = await mkdtemp(join(tmpdir(), "df-scripts-"));
  await mkdir(join(repo, "scripts"), { recursive: true });
  for (const name of scripts) {
    await copyFile(join(REAL_REPO, "scripts", name), join(repo, "scripts", name));
    await chmod(join(repo, "scripts", name), 0o755);
  }
  return { repo, done: () => rm(repo, { recursive: true, force: true }) };
}
async function put(repo, rel, text) {
  await mkdir(dirname(join(repo, rel)), { recursive: true });
  await writeFile(join(repo, rel), text);
}
const run = (repo, name) => spawnSync(join(repo, "scripts", name), { encoding: "utf8" });

test("the gallery copies at the repo root equal the files in the mod folder", async () => {
  for (const name of ["RECIPE.md", "preview.png"]) {
    const root = await readFile(join(REAL_REPO, name));
    const mod = await readFile(join(REAL_REPO, "mods/df-classic", name));
    assert.ok(root.equals(mod), `${name} at the root differs from mods/df-classic/${name}: run scripts/sync-gallery-copies.sh`);
  }
});

test("sync-gallery-copies copies what differs, says so, and is silent when in step", async () => {
  const s = await sandbox("sync-gallery-copies.sh");
  try {
    await put(s.repo, "mods/df-classic/RECIPE.md", "new recipe\n");
    await put(s.repo, "mods/df-classic/preview.png", "new png\n");
    await put(s.repo, "RECIPE.md", "old recipe\n");
    const first = run(s.repo, "sync-gallery-copies.sh");
    assert.equal(first.status, 0);
    assert.match(first.stdout, /copied RECIPE\.md/);
    assert.match(first.stdout, /copied preview\.png/);
    assert.equal(await readFile(join(s.repo, "RECIPE.md"), "utf8"), "new recipe\n");
    assert.equal(await readFile(join(s.repo, "preview.png"), "utf8"), "new png\n");
    assert.equal(run(s.repo, "sync-gallery-copies.sh").stdout, "");
  } finally {
    await s.done();
  }
});

test("scan-references passes clean guidance, this repo's own link and Herdr's own site", async () => {
  const s = await sandbox("scan-references.sh");
  try {
    await put(s.repo, "AGENTS.md", "See https://github.com/kevbost/herdr-dwarf-fortress and herdr.dev/layouts for the gallery.\n");
    await put(s.repo, "DEVELOPMENT.md", "Read ~/.config/herdr-app/AGENTS.md.\n");
    const result = run(s.repo, "scan-references.sh");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /clean/);
  } finally {
    await s.done();
  }
});

test("scan-references fails on a link to another GitHub project, naming file and line", async () => {
  const s = await sandbox("scan-references.sh");
  try {
    await put(s.repo, "DEVELOPMENT.md", "fine\nsee github.com/someone/their-layout for ideas\n");
    const result = run(s.repo, "scan-references.sh");
    assert.equal(result.status, 1);
    assert.match(result.stdout, /DEVELOPMENT\.md:2:/);
  } finally {
    await s.done();
  }
});

test("scan-references: this repo's link is fine, but a fork's name or a second link on the same line is not", async () => {
  const s = await sandbox("scan-references.sh");
  try {
    await put(s.repo, "AGENTS.md", "see github.com/kevbost/herdr-dwarf-fortress.\n");
    assert.equal(run(s.repo, "scan-references.sh").status, 0);
    await put(s.repo, "AGENTS.md", "see github.com/kevbost/herdr-dwarf-fortress-fork\n");
    assert.equal(run(s.repo, "scan-references.sh").status, 1);
    await put(s.repo, "AGENTS.md", "github.com/kevbost/herdr-dwarf-fortress and github.com/someone/else\n");
    assert.equal(run(s.repo, "scan-references.sh").status, 1);
  } finally {
    await s.done();
  }
});

test("scan-references fails on a gallery entry link with an owner", async () => {
  const s = await sandbox("scan-references.sh");
  try {
    await put(s.repo, "AGENTS.md", "like herdr.dev/mods/someone/thing does\n");
    assert.equal(run(s.repo, "scan-references.sh").status, 1);
  } finally {
    await s.done();
  }
});

test("scan-references fails on a listed name, in any case, and ignores blank lines in the list", async () => {
  const s = await sandbox("scan-references.sh");
  try {
    await put(s.repo, "scripts/.community-names", "zorkdelve\n\nother-name\n");
    await put(s.repo, "mods/df-classic/AGENTS.md", "As ZorkDelve does it.\n");
    const result = run(s.repo, "scan-references.sh");
    assert.equal(result.status, 1);
    assert.match(result.stdout, /mods\/df-classic\/AGENTS\.md:1:/);
    await put(s.repo, "mods/df-classic/AGENTS.md", "zorkdelvery is not the word.\n");
    assert.equal(run(s.repo, "scan-references.sh").status, 0);
  } finally {
    await s.done();
  }
});

test("scan-references also reads the hook scripts and settings", async () => {
  const s = await sandbox("scan-references.sh");
  try {
    await put(s.repo, ".claude/hooks/deploy-after-change", "# copied from github.com/someone/their-hooks\n");
    assert.equal(run(s.repo, "scan-references.sh").status, 1);
    await rm(join(s.repo, ".claude/hooks/deploy-after-change"));
    await put(s.repo, ".claude/settings.json", '{"note":"github.com/someone/x"}\n');
    assert.equal(run(s.repo, "scan-references.sh").status, 1);
  } finally {
    await s.done();
  }
});

test("scan-private still finds an email address and passes a clean repo", async () => {
  const s = await sandbox("scan-private.sh");
  try {
    await put(s.repo, "README.md", "nothing here\n");
    assert.equal(run(s.repo, "scan-private.sh").status, 0);
    // built from parts so this file does not trip the scan it tests
    await put(s.repo, "README.md", `write to ${["someone", "example.com"].join("@")}\n`);
    const result = run(s.repo, "scan-private.sh");
    assert.equal(result.status, 1);
    assert.match(result.stdout, /an email address/);
  } finally {
    await s.done();
  }
});
