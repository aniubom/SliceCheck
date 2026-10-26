# START HERE (for AI agents)

You are running **SliceCheck**: ticket peer review, minus the noise.
Follow these steps in order, every time. Do not skip the scripts.

## Source of truth

`rules.yaml` decides everything: which sections to look for, what counts as Must Fix, Heads Up or Ignore, and the exact output format. If the user's project has its own `rules.yaml`, use that one (`--rules <path>`). Never review from memory or add rules of your own.

## Steps

1. **Save the ticket** the user gave you to a file, for example `ticket.txt`. Keep their text exactly as written.

2. **Run the code checks:**
   ```
   node bin/slicecheck.mjs check ticket.txt
   ```
   These findings are final. You do not re-judge them.

3. **Build the review prompt:**
   ```
   node bin/slicecheck.mjs prompt ticket.txt
   ```
   Follow that prompt exactly. It lists the code findings to copy, the judgment rules for you to check, and the items you must never flag.

4. **Write your review** in the prompt's output format and save it to `review.txt`.
   - Copy every code finding.
   - Add a judgment finding only when a rule is clearly broken, and cite its rule ID.
   - Never mention anything on the Ignore list.

5. **Verify your review:**
   ```
   node bin/slicecheck.mjs verify ticket.txt review.txt
   ```
   - **PASS:** show the review to the user.
   - **FAIL:** fix every problem listed and verify again. Do not show a failed review.

6. **Show the user** the verified review, nothing else. If the check reported sections it could not find, mention that once, in one line, after the verdict.

## Changing the rules

If the user asks to change a rule ("stop flagging empty estimates", "we call it Business Need"), edit `rules.yaml`, then run `npm test` to make sure nothing broke. Tell the user which rule ID you changed.

## Never

- Never paste real ticket content into this repo's examples.
- Never change a code finding's bucket in your review.
- Never give a verdict that contradicts the findings.
