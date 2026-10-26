// Builds the self-contained skill folder: skills/slicecheck/
// One bundled script (no npm install needed) plus a copy of the default rules.
import { build } from "esbuild";
import fs from "node:fs";

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
console.log("Built skills/slicecheck");
