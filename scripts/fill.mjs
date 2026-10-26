// Fills an instruction template for one target (paths, commands) with the
// shared rulebook. Used by the build and by the tests.
import fs from "node:fs";
import yaml from "js-yaml";

export function fillTarget(t) {
  const rules = yaml.load(fs.readFileSync("rules.yaml", "utf8"));
  const v = { ...t, BLOCKED: rules.output.verdict.blocked, CLEAR: rules.output.verdict.clear };
  const sub = (s) => s.replace(/\{(PY|CMD|RULES|FILES|NODECMD|NODEIF|GET|BLOCKED|CLEAR)\}/g, (_, k) => v[k] ?? "");
  const block = sub(fs.readFileSync("scripts/templates/rules-block.md", "utf8").trim());
  return sub(fs.readFileSync(`scripts/templates/${t.template}`, "utf8").replace("{BLOCK}", block));
}
