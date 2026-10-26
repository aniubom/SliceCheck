// Builds the self-contained skill folder: skills/slicecheck/
// One bundled script and the Python engine (no install needed) plus rules.json.
import { build } from "esbuild";
import fs from "node:fs";
import yaml from "js-yaml";
import { fillTarget } from "./fill.mjs";

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

fs.rmSync(`${out}/rules.yaml`, { force: true });

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
const targets = JSON.parse(fs.readFileSync("scripts/templates/targets.json", "utf8"));
for (const [file, t] of Object.entries(targets)) fs.writeFileSync(file, fillTarget(t));
console.log("Built skills/slicecheck, python/rules.json, kits/ and START-HERE.md");
