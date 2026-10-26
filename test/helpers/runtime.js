import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

// PYTHON accepts an explicit executable; otherwise try common Python 3 commands.
const candidates = process.env.PYTHON
  ? [[process.env.PYTHON, []]]
  : [["python3", []], ["python", []], ["py", ["-3"]]];
const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" };
const runtime = candidates.find(([command, args]) => {
  const result = spawnSync(command, [...args, "-c", "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)"], { env });
  return !result.error && result.status === 0;
});
if (!runtime) throw new Error("Python 3 is required for the tests. Install it or set PYTHON to its executable.");

export const normalizeNewlines = (text) => text.replace(/\r\n?/g, "\n");

export function runPython(args, options = {}) {
  return normalizeNewlines(execFileSync(runtime[0], [...runtime[1], ...args], {
    ...options, env: { ...env, ...options.env }, encoding: "utf8",
  }));
}

export function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "slicecheck-test-"));
  try { return fn(dir); }
  finally {
    if (path.dirname(path.resolve(dir)) !== path.resolve(os.tmpdir()) ||
        !path.basename(dir).startsWith("slicecheck-test-")) {
      throw new Error("Refusing to remove a directory outside the test temp folder.");
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
