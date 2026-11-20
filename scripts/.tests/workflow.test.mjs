import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { baseline } from "../deploy-to-herdr.mjs";

const REAL = resolve(import.meta.dirname, "..", "..");
const SCRIPTS = [
  "deploy-to-herdr.mjs",
  "deploy-plan.mjs",
  "sync-gallery-copies.sh",
  "scan-private.sh",
  "scan-references.sh",
  "sync-from-herdr.sh",
];

async function put(root, rel, text) {
  await mkdir(dirname(join(root, rel)), { recursive: true });
  await writeFile(join(root, rel), text);
}
const read = (root, rel) => readFile(join(root, rel), "utf8");
const git = (repo, ...args) =>
  spawnSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t.invalid", ...args], { encoding: "utf8" });

// A throwaway repo, a throwaway Herdr home that starts identical (baseline recorded),
// the real hooks and scripts copied in, and a stand-in `herdr-app` that logs its calls.
async function workspace() {
  const dir = await mkdtemp(join(tmpdir(), "df-flow-"));
  const repo = join(dir, "repo");
  const home = join(dir, "home");
  const bin = join(dir, "bin");
  const log = join(dir, "herdr-app.log");
  await mkdir(bin);
  await writeFile(
    join(bin, "herdr-app"),
    `#!/bin/sh
echo "$@" >> "$STUB_LOG"
case "$1" in
  check) [ "\${STUB_CHECK:-ok}" = ok ] || { echo "stub check failure"; exit 1; } ;;
  status) if [ -n "\${STUB_STATUS:-}" ]; then echo "$STUB_STATUS"; else echo '{"errors":[]}'; fi ;;
esac
`,
  );
  await chmod(join(bin, "herdr-app"), 0o755);
  await writeFile(log, "");
  const files = {
    "layouts/df-classic.json": '{"a":1}\n',
    "themes/df-classic.json": "{}\n",
    "mods/df-classic/main.js": "export default 1;\n",
    "mods/df-classic/.tests/ok.test.mjs": 'import test from "node:test";\ntest("ok", () => {});\n',
    "mods/df-classic/RECIPE.md": "recipe\n",
    "mods/df-classic/preview.png": "png\n",
    "RECIPE.md": "recipe\n",
    "preview.png": "png\n",
    "scripts/.tests/ok.test.mjs": 'import test from "node:test";\ntest("ok", () => {});\n',
    ".gitignore": ".deploy-state/\n",
  };
  for (const [rel, text] of Object.entries(files)) await put(repo, rel, text);
  for (const rel of ["layouts/df-classic.json", "themes/df-classic.json", "mods/df-classic/main.js", "mods/df-classic/.tests/ok.test.mjs"]) {
    await put(home, rel, files[rel]);
  }
  for (const name of SCRIPTS) {
    await mkdir(join(repo, "scripts"), { recursive: true });
    await copyFile(join(REAL, "scripts", name), join(repo, "scripts", name));
    await chmod(join(repo, "scripts", name), 0o755);
  }
  await cp(join(REAL, ".claude"), join(repo, ".claude"), { recursive: true });
  git(repo, "init", "-q");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "start");
  await baseline(repo, home);
  const { NODE_TEST_CONTEXT, ...clean } = process.env; // a plain run, not a child of the test runner
  const env = { ...clean, CLAUDE_PROJECT_DIR: repo, HERDR_APP_HOME: home, PATH: `${bin}:${process.env.PATH}`, STUB_LOG: log };
  const hook = (name, input, extra = {}) =>
    spawnSync(join(repo, ".claude/hooks", name), { input: JSON.stringify(input), env: { ...env, ...extra }, encoding: "utf8" });
  const calls = async () => (await read(dir, "herdr-app.log")).split("\n").filter(Boolean);
  return { dir, repo, home, hook, env, calls, done: () => rm(dir, { recursive: true, force: true }) };
}
const edit = (repo, rel) => ({ tool_name: "Edit", tool_input: { file_path: join(repo, rel) } });

test("deploy-after-change: an edit outside the deployed set does nothing", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const r = w.hook("deploy-after-change", edit(w.repo, "scripts/deploy-plan.mjs"));
    assert.equal(r.status, 0);
    assert.equal(await read(w.home, "mods/df-classic/main.js"), "export default 1;\n");
  } finally {
    await w.done();
  }
});

test("deploy-after-change: an edit to the mod is deployed and the mod is checked", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const r = w.hook("deploy-after-change", edit(w.repo, "mods/df-classic/main.js"));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(await read(w.home, "mods/df-classic/main.js"), "export default 2;\n");
    assert.ok((await w.calls()).some((c) => c.startsWith("check ")));
  } finally {
    await w.done();
  }
});

test("deploy-after-change: a Bash call deploys too, and an idle one is silent and runs no check", async () => {
  const w = await workspace();
  try {
    const idle = w.hook("deploy-after-change", { tool_name: "Bash", tool_input: { command: "ls" } });
    assert.deepEqual([idle.status, idle.stdout, idle.stderr], [0, "", ""]);
    assert.deepEqual(await w.calls(), []);
    await put(w.repo, "mods/df-classic/main.js", "export default 3;\n");
    const r = w.hook("deploy-after-change", { tool_name: "Bash", tool_input: { command: "cp x y" } });
    assert.equal(r.status, 0);
    assert.equal(await read(w.home, "mods/df-classic/main.js"), "export default 3;\n");
  } finally {
    await w.done();
  }
});

test("deploy-after-change: a failed check exits 2 with the check's words", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const r = w.hook("deploy-after-change", edit(w.repo, "mods/df-classic/main.js"), { STUB_CHECK: "fail" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /stub check failure/);
  } finally {
    await w.done();
  }
});

test("deploy-after-change: a conflict exits 2, and the mod that did go out is still checked", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "layouts/df-classic.json", '{"a":2}\n');
    await put(w.home, "layouts/df-classic.json", '{"a":9}\n');
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const r = w.hook("deploy-after-change", { tool_name: "Bash", tool_input: { command: "x" } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /conflict: layouts\/df-classic\.json/);
    assert.equal(await read(w.home, "layouts/df-classic.json"), '{"a":9}\n');
    assert.ok((await w.calls()).some((c) => c.startsWith("check ")), "check ran despite the conflict");
  } finally {
    await w.done();
  }
});

test("hooks do nothing when there is no Herdr home", async () => {
  const w = await workspace();
  try {
    const nowhere = { HERDR_APP_HOME: join(w.dir, "nowhere") };
    assert.equal(w.hook("deploy-after-change", { tool_name: "Bash", tool_input: { command: "x" } }, nowhere).status, 0);
    const start = w.hook("session-start", {}, nowhere);
    assert.equal(start.status, 0);
    assert.match(start.stdout, /no Herdr home/);
  } finally {
    await w.done();
  }
});

test("session-start says what it did", async () => {
  const w = await workspace();
  try {
    assert.match(w.hook("session-start", {}).stdout, /in step/);
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    assert.match(w.hook("session-start", {}).stdout, /deployed mods\/df-classic\/main\.js/);
  } finally {
    await w.done();
  }
});

test("verify-before-stop: a clean tree and stop_hook_active both pass at once", async () => {
  const w = await workspace();
  try {
    assert.equal(w.hook("verify-before-stop", { stop_hook_active: false }).status, 0);
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    assert.equal(w.hook("verify-before-stop", { stop_hook_active: true }).status, 0);
    assert.deepEqual(await w.calls(), []);
  } finally {
    await w.done();
  }
});

test("verify-before-stop: passes, remembers it, and skips the second run", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const first = w.hook("verify-before-stop", { stop_hook_active: false });
    assert.equal(first.status, 0, first.stderr);
    const calls = (await w.calls()).length;
    assert.ok(calls >= 2, "check and status ran");
    assert.equal(w.hook("verify-before-stop", { stop_hook_active: false }).status, 0);
    assert.equal((await w.calls()).length, calls, "nothing ran the second time");
  } finally {
    await w.done();
  }
});

test("verify-before-stop: errors in herdr-app status fail it", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const r = w.hook("verify-before-stop", { stop_hook_active: false }, { STUB_STATUS: '{"errors":["layout.error: bad"]}' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /herdr-app status/);
    assert.match(r.stderr, /layout\.error: bad/);
  } finally {
    await w.done();
  }
});

test("verify-before-stop: a failing mod test fails it, and a failure is not remembered", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/.tests/ok.test.mjs", 'import test from "node:test";\ntest("bad", () => { throw new Error("nope"); });\n');
    const r = w.hook("verify-before-stop", { stop_hook_active: false });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /mod tests failed/);
    assert.equal(w.hook("verify-before-stop", { stop_hook_active: false }).status, 2);
  } finally {
    await w.done();
  }
});

test("sync-from-herdr: refuses over uncommitted repo changes", async () => {
  const w = await workspace();
  try {
    await put(w.repo, "mods/df-classic/main.js", "export default 2;\n");
    const r = spawnSync(join(w.repo, "scripts/sync-from-herdr.sh"), { env: w.env, encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /uncommitted changes/);
    assert.equal(await read(w.repo, "mods/df-classic/main.js"), "export default 2;\n");
  } finally {
    await w.done();
  }
});

test("sync-from-herdr: pulls an app-made change, ignores the home's stale gallery files, and re-baselines", async () => {
  const w = await workspace();
  try {
    await put(w.home, "layouts/df-classic.json", '{"a":1,"menu":"right"}\n');
    await put(w.home, "mods/df-classic/RECIPE.md", "STALE recipe\n");
    await put(w.home, "mods/df-classic/preview.png", "STALE png\n");
    const check = spawnSync(join(w.repo, "scripts/sync-from-herdr.sh"), ["check"], { env: w.env, encoding: "utf8" });
    assert.match(check.stdout, /differs: layouts\/df-classic\.json/);
    assert.doesNotMatch(check.stdout, /RECIPE|preview/);
    const pull = spawnSync(join(w.repo, "scripts/sync-from-herdr.sh"), { env: w.env, encoding: "utf8" });
    assert.equal(pull.status, 0, pull.stdout + pull.stderr);
    assert.equal(await read(w.repo, "layouts/df-classic.json"), '{"a":1,"menu":"right"}\n');
    for (const rel of ["RECIPE.md", "preview.png", "mods/df-classic/RECIPE.md", "mods/df-classic/preview.png"]) {
      assert.doesNotMatch(await read(w.repo, rel), /STALE/, rel);
    }
    const deploy = spawnSync("node", [join(w.repo, "scripts/deploy-to-herdr.mjs")], { env: w.env, encoding: "utf8" });
    assert.deepEqual([deploy.status, deploy.stdout, deploy.stderr], [0, "", ""]);
    assert.ok((await readdir(join(w.repo, ".deploy-state"))).includes("base.json"));
  } finally {
    await w.done();
  }
});
