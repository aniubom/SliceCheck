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
console.log("Built skills/slicecheck");
