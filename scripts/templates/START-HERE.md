# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise. The user wants a ticket peer reviewed. Follow these rules exactly. They are the same everywhere SliceCheck runs.

## Files

Save these two files from this repo into your working folder, side by side: `python/slicecheck.py` (the engine) and `python/rules.json` (the rules). If you're reading the repo through GitHub or the web, load them into your code tool. Nothing needs installing.

## Rules

{BLOCK}

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), copy `rules.json` to `slicecheck.rules.json` in their project, edit that copy, and tell them which rule ID changed. The engine uses `slicecheck.rules.json` automatically when it's in the working folder. Never edit the defaults for one team.
