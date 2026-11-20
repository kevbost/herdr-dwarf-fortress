// Decides what a deploy does, from three maps of relative path -> content hash
// (a path that is absent is undefined):
//   repo: the files in the repo (the source)
//   live: the same paths in the Herdr home
//   base: what the last deploy left in both, recorded at that time
// Pure: no fs, so every row of the table in DEVELOPMENT.md is a unit test.
//
// Live-only files are never looked at (Herdr's jsconfig.json, caches, ...): only
// paths the repo has, or the last deploy wrote, can be planned.
export function planDeploy({ repo, live, base }) {
  const plan = { write: [], remove: [], record: [], forget: [], conflicts: [], keep: [] };
  const paths = [...new Set([...Object.keys(repo), ...Object.keys(base)])].sort();
  for (const path of paths) {
    const r = repo[path];
    const l = live[path];
    const b = base[path];
    if (r !== undefined) {
      if (r === b) plan.keep.push(path); // unchanged in the repo: a live change (the menu side) stays
      else if (r === l) plan.record.push(path); // already identical
      else if (l === b || l === undefined) plan.write.push(path); // a deleted live file is how a conflict is resolved for the repo copy
      else plan.conflicts.push({ path, reason: "changed in the repo and in the Herdr home" });
    } else if (l === undefined) {
      plan.forget.push(path);
    } else if (l === b) {
      plan.remove.push(path);
    } else {
      plan.conflicts.push({ path, reason: "removed in the repo but changed in the Herdr home" });
    }
  }
  return plan;
}
