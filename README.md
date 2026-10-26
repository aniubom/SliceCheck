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
> **Verdict:** 🔴 Needs attention: MF-05, MF-06

## Quick start

**Already chatting with an AI that can read GitHub or the web?** Tell it:

> Use github.com/aniubom/SliceCheck to peer review this ticket: *(paste your ticket)*

It reads [`START-HERE.md`](START-HERE.md), runs SliceCheck's checks in its own code tool, verifies its review, and shows you the result.

**Want it every time, without explaining?** Pick the setup for your AI under [Use it inside your AI](#use-it-inside-your-ai).

## Why it exists

I originally built SliceCheck to help with peer reviews on my own team. 

At the time, we were reviewing tickets manually, and I saw an opportunity to use AI to make the process faster and more consistent.

I put together an AI-powered prompt that checked tickets against a set of review rules and presented the findings in a clean, color-coded widget, with issues grouped by severity and a verdict you could read in 5 seconds.

That experience helped shape SliceCheck. I realized that a good review tool needs to know not only what to flag, but also what to Ignore.

The goal isn't to find something wrong with every ticket. It's to help teams catch what matters without getting buried in unnecessary feedback.

## How it works

1. **Rules decide everything.** `rules.yaml` lists every rule with an ID (`MF-01`, `HU-03`, `IG-02`), a bucket, and the section it applies to.
2. **Code checks the mechanical rules.** Empty fields, placeholder dates, AC numbering gaps, copy-paste duplicates: checked by script, the same way every time.
3. **AI checks the judgment rules.** Is the problem statement clear? Are the ACs testable? Any typos or unclear language?
4. **Every review gets verified.** Each finding must cite a real rule, nothing on the Ignore list can be flagged, and the verdict has to match the findings. You only hear about verification if something couldn't be verified. Verification checks that the review follows the rules. It doesn't judge whether each AI call is right.

The rules travel with every review, so nothing depends on the AI remembering them.

## Use it inside your AI

SliceCheck runs inside the AI you already use. Set it up once, then just paste tickets. The AI runs the checks, writes the review, verifies it, and fixes it before you see it.

**1. As a skill (Claude, Codex, GitHub Copilot, Cursor, Gemini CLI and other tools that support SKILL.md).** Copy the [`skills/slicecheck`](skills/slicecheck/SKILL.md) folder into your tool's skills folder (for Claude Code: `~/.claude/skills/`). It's self-contained: the scripts, the rules, the instructions. Uses Python if you have it, Node if you don't. Nothing to install.

**2. As an MCP server (Claude Desktop, Claude Code, VS Code Copilot, Cursor).** Adds `check_ticket`, `verify_review` and `get_rules` as tools in your chat. Setup: [`mcp/README.md`](mcp/README.md).

**3. Microsoft 365 Copilot or ChatGPT at work.** Build a SliceCheck agent once, with no install and no IT ticket for a personal agent (your company's settings decide what's available). After that, open the agent and paste tickets. It runs the same checks and verifies itself using the built-in code tool.
- Copilot (Agent Builder): [`kits/copilot/SETUP.md`](kits/copilot/SETUP.md)
- ChatGPT (Custom GPT): [`kits/chatgpt/SETUP.md`](kits/chatgpt/SETUP.md)

**4. No setup at all.** Paste the prompt in [`copilot-prompt.md`](copilot-prompt.md) into any AI once per chat, then paste tickets. Less exact: the AI judges every rule itself and nothing verifies it.

The engine ships in JavaScript and Python. The Python version gives identical results and needs nothing installed, which is how it runs inside ChatGPT, Copilot and Claude.ai.

Prefer the command line? Clone the repo and run `npm install` once (or use `python3 python/slicecheck.py` with the same commands, nothing to install):

```bash
node bin/slicecheck.mjs check  ticket.txt              # code findings
node bin/slicecheck.mjs prompt ticket.txt              # full review instructions
node bin/slicecheck.mjs verify ticket.txt review.txt   # check a review
```

## Make it yours

Your team has its own rules. Add them.

- **Just ask your AI:** "stop flagging empty estimates," "we call it Business Need," "turn on the approval rule." It saves your team's version and leaves the defaults alone.
- **In the file:** the rules are plain text. With the skill or command line, your team's copy is `slicecheck.rules.yaml` in your project (commit it so everyone reviews the same way). In a Copilot agent or Custom GPT, it's the `rules.json` file you uploaded.
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

Tests require Node and Python 3. If Python isn't on your PATH, set `PYTHON` to the path of its executable.

---

MIT License · Built by Ani Ubom · [aubom.online](https://aubom.online) · [LinkedIn](https://www.linkedin.com/in/aniemaubom/)
