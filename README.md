# SliceCheck

**Ticket peer review, minus the noise.**

AI peer review for requirements: user stories and acceptance criteria, sorted into **Must Fix**, **Heads Up**, and **Ignore**.

Paste a ticket into your AI and say **"peer review this."** You get back one clean review (this is [sample ticket 07](examples/07-untestable-ac-typos-jira.md)):

> **SliceCheck review**
>
> 🔴 **Must Fix**
> - **MF-05 · Acceptance criteria:** "should be user friendly" has no pass/fail outcome.
> - **MF-06 · User story and AC:** typos, "maintanence" and "intutive".
>
> ✅ **Good:** Problem statement, Estimate, Assignee
>
> **Verdict:** 🔴 Needs attention before refinement: MF-05, MF-06

## Why it exists

I built the first version for my own team's peer reviews. We already had an AI review agent, so I tested both on the same live ticket. Theirs came back with an eight-section report, wrong findings, and advice nobody asked for. Mine came back with no false positives and a verdict you could read in five seconds. A teammate asked for my prompt that week.

The difference wasn't a smarter model. It was deciding up front what *doesn't* count as a problem. Noise is what makes people stop trusting a review tool, so in SliceCheck, **Ignore is a first-class bucket**.

## How it works

1. **Rules decide everything.** `rules.yaml` lists every rule with an ID (`MF-01`, `HU-03`, `IG-02`), a bucket, and the section it applies to.
2. **Code checks the mechanical rules.** Empty fields, placeholder dates, AC numbering gaps, copy-paste duplicates: checked by script, the same way every time.
3. **AI checks the judgment rules.** Is the problem statement clear? Are the ACs testable? Any typos or unclear language?
4. **Every review gets verified.** Each finding must cite a real rule, nothing on the Ignore list can be flagged, and the verdict has to match the findings. Any Must Fix means it can't say "Clear to proceed."

The rules travel with every review, so nothing depends on the AI remembering them.

## Use it inside your AI

SliceCheck runs inside the AI you already use. No copy-paste, no extra tab. The AI runs the checks, writes the review, verifies it, and fixes it before you see it.

**1. As a skill (Claude, Codex, GitHub Copilot, Cursor, Gemini CLI and other tools that support SKILL.md).** Copy the [`skills/slicecheck`](skills/slicecheck/SKILL.md) folder into your tool's skills folder (for Claude Code: `~/.claude/skills/`). It's self-contained: one script, the rules, the instructions. Needs Node 18+, nothing to install.

**2. As an MCP server (Claude Desktop, Claude Code, VS Code Copilot, Cursor).** Adds `check_ticket`, `verify_review` and `get_rules` as tools in your chat. Runs on your machine, so tickets never leave it. Setup: [`mcp/README.md`](mcp/README.md).

**3. Copilot or ChatGPT with no setup.** Paste [`copilot-prompt.md`](copilot-prompt.md) once, then paste tickets. Less exact: the AI judges every rule, including the ones the other versions check with code.

Prefer the command line?

```bash
node bin/slicecheck.mjs check  ticket.txt              # code findings
node bin/slicecheck.mjs prompt ticket.txt              # full review instructions
node bin/slicecheck.mjs verify ticket.txt review.txt   # check a review
```

## Make it yours

Your team has its own rules. Add them.

- **Just ask your AI:** "stop flagging empty estimates," "we call it Business Need," "turn on the approval rule." It saves your team's version as `slicecheck.rules.yaml` in your project and leaves the defaults alone.
- **In the file:** edit `slicecheck.rules.yaml` directly. It's plain text with comments. Commit it so your whole team reviews the same way.
- **Team pack:** optional rules many teams use (approvals, change messages, process-flow diagrams, vendor estimates) ship turned off. Switch on the ones you need.

## Default rules

| | Rule | Checked by |
|---|---|---|
| 🔴 MF-01 | Problem statement is missing | code |
| 🔴 MF-02 | Problem statement is too vague | AI |
| 🔴 MF-03 | User story is missing the role, want or benefit | AI |
| 🔴 MF-04 | Acceptance criteria are missing | code |
| 🔴 MF-05 | An acceptance criterion isn't testable | AI |
| 🔴 MF-06 | Typo or unclear language | AI |
| 🟡 HU-01 | Estimate is empty | code |
| 🟡 HU-02 | Assignee is empty past refinement | code |
| 🟡 HU-03 | AC numbering has a gap | code |
| 🟡 HU-04 | A block of text is repeated | code |
| 🟡 HU-05 | Dependency with no owner or date | AI |
| ⚪ IG-01–05 | Placeholder dates, template instruction text, optional N/A sections, empty assignee at refinement, refinement status | never flagged |

## Tested

Eight invented sample tickets in three formats (Wrike-style, Jira-style, plain) live in [`examples/`](examples/), each with expected results. `npm test` runs them, and GitHub runs them on every change.

---

Built by Ani Ubom · [aubom.online](https://aubom.online) · [LinkedIn](https://www.linkedin.com/in/aniemaubom/)
