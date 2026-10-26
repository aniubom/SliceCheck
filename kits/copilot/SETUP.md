# SliceCheck for Microsoft 365 Copilot (Agent Builder)

Build once, then just paste tickets. Tickets stay inside the Copilot your company already approved.

You need: Microsoft 365 Copilot with Agent Builder available to you (your company's settings decide this), and these three files from this folder:
- `instructions.txt`
- `slicecheck.py.txt` and `rules.json.txt`

Copilot only accepts certain file types as knowledge (.txt is one), so the engine and rules are saved as `.txt`. The instructions tell the agent to rename them before running.

## Build it

1. In Microsoft 365 Copilot, choose **New agent**, then **Skip to configure**.
2. **Name:** SliceCheck
3. **Description:** Ticket peer review, minus the noise.
4. **Instructions:** paste everything in `instructions.txt`.
5. **Knowledge:** upload `slicecheck.py.txt` and `rules.json.txt`.
6. **Capabilities:** turn on **Create documents, charts, and code** (the code interpreter). This is what lets it run the checks and verify its own review.
7. **Starter prompts:** "Peer review this ticket:" and "Show me the rules."
8. **Create.** You can share it with coworkers from the agent's settings.

## Test it

Paste a sample ticket from the repo's `examples/` folder, for example `07-untestable-ac-typos-jira.md`. A correct result has Must Fix findings MF-05 and MF-06 and the verdict "🔴 Needs attention before refinement". Every sample's expected result is in `examples/expected.yaml`.

**If the review ends with "wasn't verified":** the code interpreter didn't run the uploaded engine. Check that **Create documents, charts, and code** is on and both `.txt` files are uploaded. Some company settings limit what the code interpreter can do. In that case the agent still reviews with your rules, just without the automatic checks and verification.

## Your team's rules

Edit `rules.json.txt` (it's JSON: change a rule's `bucket`, add section names under `sections`), then replace the file in the agent's Knowledge.
