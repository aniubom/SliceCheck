# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise. The user wants a ticket peer reviewed. Follow these rules exactly. They are the same everywhere SliceCheck runs.

## Rules

{BLOCK}

## Files

Get only the two files for the engine Rule 1 picked, from this repo, and save them side by side in one folder. Nothing needs installing.
- Python: `python/slicecheck.py` and `python/rules.json`
- Node: `skills/slicecheck/scripts/slicecheck.mjs` and `skills/slicecheck/scripts/rules.json`

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy `rules.json` to `slicecheck.rules.json` in their project, edit that copy, and tell them which rule ID changed. Both engines use `slicecheck.rules.json` automatically when it's in the working folder. Never edit the defaults for one team.
