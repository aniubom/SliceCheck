---
name: slicecheck
description: Ticket peer review, minus the noise. Reviews a user story or ticket (problem statement, user story, acceptance criteria, fields) and sorts findings into Must Fix, Heads Up and Ignore using SliceCheck's rules, with scripts that check the mechanical rules and verify every review. Use when someone asks to peer review, check, QA or "slice check" a ticket, user story or requirements.
---

# SliceCheck

Follow these rules exactly. Paths are relative to this skill's folder. Nothing to install. If Python isn't available but Node is, use `node scripts/slicecheck.mjs` in place of `python3 scripts/slicecheck.py`.

## Rules

{BLOCK}

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need", "turn on the approval rule"), copy `scripts/rules.json` to `slicecheck.rules.json` in their project (with Node: copy `rules.yaml` to `slicecheck.rules.yaml`), edit that copy, and tell them which rule ID changed. The scripts use the team file automatically. Never edit the defaults in this folder for one team.
