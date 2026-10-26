// Builds the self-contained skill folder: skills/slicecheck/
// One bundled script (no npm install needed) plus a copy of the default rules.
import { build } from "esbuild";
import fs from "node:fs";
import yaml from "js-yaml";

const out = "skills/slicecheck";
fs.mkdirSync(`${out}/scripts`, { recursive: true });

await build({
  entryPoints: ["bin/slicecheck.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: `${out}/scripts/slicecheck.mjs`,
  banner: { js: "// SliceCheck bundled script. Built from the SliceCheck repo; edit the source, not this file." },
  legalComments: "inline",
});

fs.copyFileSync("rules.yaml", `${out}/rules.yaml`);

// Python engine (for ChatGPT / Copilot / Claude.ai code sandboxes) reads JSON.
fs.writeFileSync("python/rules.json", JSON.stringify(yaml.load(fs.readFileSync("rules.yaml", "utf8")), null, 2) + "\n");
// Same engine in Python, for environments without Node.
fs.copyFileSync("python/slicecheck.py", `${out}/scripts/slicecheck.py`);
fs.copyFileSync("python/rules.json", `${out}/scripts/rules.json`);
// Ready-to-upload kits for ChatGPT (Custom GPT) and Microsoft 365 Copilot (Agent Builder).
fs.copyFileSync("python/slicecheck.py", "kits/chatgpt/slicecheck.py");
fs.copyFileSync("python/rules.json", "kits/chatgpt/rules.json");
fs.copyFileSync("python/slicecheck.py", "kits/copilot/slicecheck.py.txt"); // Copilot knowledge accepts .txt
fs.copyFileSync("python/rules.json", "kits/copilot/rules.json.txt");
// One rulebook, generated into every instruction file so they can never disagree.
const block = fs.readFileSync("scripts/templates/rules-block.md", "utf8").trim();
const fill = (tpl, v) =>
  tpl.replace("{BLOCK}", block).replace(/\{(PY|CMD|RULES|FILES)\}/g, (_, k) => v[k]);
const tpl = (f) => fs.readFileSync(`scripts/templates/${f}`, "utf8");
fs.writeFileSync("START-HERE.md", fill(tpl("START-HERE.md"), { PY: "python3", CMD: "python3 slicecheck.py", RULES: "rules.json" }));
fs.writeFileSync(`${out}/SKILL.md`, fill(tpl("SKILL.md"), { PY: "python3", CMD: "python3 scripts/slicecheck.py", RULES: "scripts/rules.json" }));
const kit = { PY: "python", CMD: "python slicecheck.py", RULES: "rules.json" };
fs.writeFileSync("kits/chatgpt/instructions.txt", fill(tpl("kit-instructions.txt"), { ...kit,
  FILES: "- slicecheck.py: the SliceCheck engine (Python, standard library only).\n- rules.json: the review rules. They decide everything." }));
fs.writeFileSync("kits/copilot/instructions.txt", fill(tpl("kit-instructions.txt"), { ...kit,
  FILES: "- slicecheck.py.txt and rules.json.txt. Before Rule 1, save copies named slicecheck.py and rules.json in your working folder." }));
console.log("Built skills/slicecheck, python/rules.json, kits/ and START-HERE.md");
