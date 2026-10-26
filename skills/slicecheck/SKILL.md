---
name: slicecheck
description: Peer review a ticket (user story, acceptance criteria, fields) with SliceCheck. Sorts findings into Must Fix, Heads Up and Ignore from rules.yaml, checks mechanical rules with code, and verifies the review before showing it. Use when someone asks to peer review, check or QA a ticket or user story.
---

# SliceCheck skill

Ticket peer review, minus the noise.

Follow `START-HERE.md` in the SliceCheck folder exactly. In short:

1. Save the user's ticket to `ticket.txt`, word for word.
2. `node bin/slicecheck.mjs check ticket.txt`: code findings, final.
3. `node bin/slicecheck.mjs prompt ticket.txt`: follow the prompt it prints.
4. Write the review in that format to `review.txt`.
5. `node bin/slicecheck.mjs verify ticket.txt review.txt`: fix and re-verify until it passes.
6. Show only the verified review.

Rules live in `rules.yaml`. If the user's project has its own rules file, pass it with `--rules <path>`. When the user asks to change a rule, edit `rules.yaml`, run `npm test`, and say which rule ID changed.

Install: copy the SliceCheck folder into your project (or clone it), run `npm install`, and copy this `skills/slicecheck` folder into `~/.claude/skills/`.
