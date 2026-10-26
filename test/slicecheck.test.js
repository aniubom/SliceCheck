import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "js-yaml";
import { parseTicket } from "../src/parse.js";
import { checkTicket } from "../src/check.js";
import { buildPrompt } from "../src/prompt.js";
import { verifyReview } from "../src/verify.js";

const rules = yaml.load(fs.readFileSync("rules.yaml", "utf8"));
const expected = yaml.load(fs.readFileSync("examples/expected.yaml", "utf8"));
const read = (f) => fs.readFileSync(`examples/${f}`, "utf8");
const run = (text, r = rules) => checkTicket(parseTicket(text, r), r);

for (const [file, exp] of Object.entries(expected)) {
  test(`${file}: stage and code findings`, () => {
    const out = run(read(file));
    assert.equal(out.stage, exp.stage);
    assert.deepEqual(out.findings.map((f) => f.id).sort(), [...exp.code].sort());
  });
}

test("every rule ID is unique", () => {
  const ids = [...rules.rules, ...rules.team_pack.rules].map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("prompt carries code findings, judgment rules and the ignore list", () => {
  const text = read("02-wrike-in-dev.txt");
  const prompt = buildPrompt(text, run(text), rules);
  for (const id of ["HU-01", "HU-04", "MF-02", "IG-01"]) assert.ok(prompt.includes(id), id);
});

test("team pack rule stays off until a team turns it on", () => {
  const text = read("02-wrike-in-dev.txt").replace("NA\nNotes:", "See the approval workflow\nNotes:");
  assert.ok(!run(text).findings.some((f) => f.id === "TP-03"));
  const on = structuredClone(rules);
  on.team_pack.rules.find((r) => r.id === "TP-03").bucket = "heads_up";
  assert.ok(run(text, on).findings.some((f) => f.id === "TP-03"));
  // Process flow marked NA: the diagram isn't required.
  assert.ok(!run(read("02-wrike-in-dev.txt"), on).findings.some((f) => f.id === "TP-03"));
});

test("verify passes a correct review and rejects a bad one", () => {
  const out = run(read("02-wrike-in-dev.txt"));
  const good = `FINDINGS
🟡 Heads Up | HU-01 | Estimate | Empty.
🟡 Heads Up | HU-02 | Assignee | Empty while In Dev.
🟡 Heads Up | HU-03 | Acceptance criteria | Starts at AC-2.
🟡 Heads Up | HU-04 | Whole ticket | Notes repeated.
GOOD
✅ Good | Problem statement, User story
VERDICT
✅ Clear to proceed`;
  assert.equal(verifyReview(good, out, rules).passed, true);

  const bad = `FINDINGS
🔴 Must Fix | MF-02 | Problem statement | Vague.
🟡 Heads Up | IG-04 | Assignee | Empty.
GOOD
✅ Good | User story
VERDICT
✅ Clear to proceed`;
  const res = verifyReview(bad, out, rules);
  assert.equal(res.passed, false);
  assert.ok(res.problems.some((p) => p.includes("ignored item")));
  assert.ok(res.problems.some((p) => p.includes("Dropped a code finding")));
  assert.ok(res.problems.some((p) => p.includes("Verdict contradicts")));
});

test("copilot-prompt.md matches rules.yaml", async () => {
  const { buildStandalonePrompt } = await import("../src/prompt.js");
  assert.ok(fs.readFileSync("copilot-prompt.md", "utf8").includes(buildStandalonePrompt(rules)),
    "copilot-prompt.md is out of date: regenerate it with `node bin/slicecheck.mjs standalone`");
});

test("skill folder is self-contained and in sync", async () => {
  const { execFileSync } = await import("node:child_process");
  assert.equal(fs.readFileSync("skills/slicecheck/rules.yaml", "utf8"), fs.readFileSync("rules.yaml", "utf8"),
    "skills/slicecheck/rules.yaml is out of date: run npm run build:skill");
  const out = execFileSync("node", ["skills/slicecheck/scripts/slicecheck.mjs", "check", "examples/04-missing-ac-jira.md"], { encoding: "utf8" });
  assert.ok(out.includes("MF-04"));
});

test("Python engine matches the JavaScript engine on every sample", async () => {
  const { execFileSync } = await import("node:child_process");
  assert.deepEqual(JSON.parse(fs.readFileSync("python/rules.json", "utf8")), rules,
    "python/rules.json is out of date: run npm run build:skill");
  for (const file of Object.keys(expected)) {
    const text = read(file);
    const py = JSON.parse(execFileSync("python3", ["python/slicecheck.py", "check", `examples/${file}`, "--json"], { encoding: "utf8" }));
    const js = run(text);
    assert.equal(py.stage, js.stage, file);
    assert.deepEqual(py.findings, js.findings, file);
    assert.deepEqual(py.notFound, js.notFound, file);
    const pyPrompt = execFileSync("python3", ["python/slicecheck.py", "prompt", `examples/${file}`], { encoding: "utf8" });
    assert.equal(pyPrompt.trimEnd(), buildPrompt(text, js, rules), `${file}: prompt differs`);
  }
});

test("Python verify agrees with JavaScript verify", async () => {
  const { execFileSync } = await import("node:child_process");
  fs.writeFileSync("/tmp/sc-bad-review.txt", "FINDINGS\n🟡 Heads Up | IG-04 | Assignee | Empty.\nGOOD\n✅ Good | x\nVERDICT\n✅ Clear to proceed\n");
  let code = 0;
  try { execFileSync("python3", ["python/slicecheck.py", "verify", "examples/02-wrike-in-dev.txt", "/tmp/sc-bad-review.txt"], { encoding: "utf8" }); }
  catch (e) { code = e.status; }
  assert.equal(code, 2);
});

test("ChatGPT and Copilot kits carry the current engine and rules", () => {
  const eng = fs.readFileSync("python/slicecheck.py", "utf8");
  const rj = fs.readFileSync("python/rules.json", "utf8");
  assert.equal(fs.readFileSync("kits/chatgpt/slicecheck.py", "utf8"), eng);
  assert.equal(fs.readFileSync("kits/chatgpt/rules.json", "utf8"), rj);
  assert.equal(fs.readFileSync("kits/copilot/slicecheck.py.txt", "utf8"), eng);
  assert.equal(fs.readFileSync("kits/copilot/rules.json.txt", "utf8"), rj);
  for (const k of ["chatgpt", "copilot"]) {
    assert.ok(fs.readFileSync(`kits/${k}/instructions.txt`, "utf8").length <= 8000, `${k} instructions over 8,000 characters`);
  }
});

test("verified review renders the same in JavaScript and Python", async () => {
  const { execFileSync } = await import("node:child_process");
  const { renderReview } = await import("../src/render.js");
  const review = `FINDINGS
🔴 Must Fix | MF-05 | Acceptance criteria | AC-3 has no pass/fail outcome.
🟡 Heads Up | HU-01 | Estimate | Empty.
GOOD
✅ Good | Problem statement, User story
VERDICT
🔴 Needs attention before refinement: MF-05`;
  const js = renderReview(review, rules);
  assert.ok(js.startsWith("**SliceCheck review**"));
  assert.ok(!/\bPASS\b/.test(js) && !/verif/i.test(js), "verification must stay silent in the rendered review");
  fs.writeFileSync("/tmp/sc-review.txt", review);
  const py = execFileSync("python3", ["-c", `import sys; sys.path.insert(0,'python'); import slicecheck as s; print(s.render_review(open('/tmp/sc-review.txt',encoding='utf-8').read(), s.load_rules('python/rules.json')))`], { encoding: "utf8" });
  assert.equal(py.trimEnd(), js);
});

test("every instruction file carries the same rulebook", () => {
  const files = ["START-HERE.md", "skills/slicecheck/SKILL.md", "kits/chatgpt/instructions.txt", "kits/copilot/instructions.txt"];
  const norm = (t) => t.slice(t.indexOf("RULE 1."), t.indexOf("RULE 5.") + 200)
    .replace(/python3? (scripts\/)?slicecheck\.py/g, "CMD").replace(/python3? --version/g, "PY --version")
    .replace(/(scripts\/)?rules\.json/g, "RULES");
  const blocks = files.map((f) => norm(fs.readFileSync(f, "utf8")));
  for (const b of blocks) assert.equal(b, blocks[0]);
});
