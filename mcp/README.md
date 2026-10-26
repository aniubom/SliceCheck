# SliceCheck MCP server

Runs SliceCheck as tools inside your AI chat: `check_ticket`, `verify_review`, `get_rules`. It runs on your own machine, so tickets never leave it.

Paste a ticket into your chat and say "peer review this." The AI checks it, writes the review, verifies it, and shows you the result.

## Setup

1. Get SliceCheck and install it once:
   ```bash
   git clone https://github.com/aniubom/SliceCheck.git
   cd SliceCheck && npm install
   ```
2. Add the server to your AI app. Replace `/path/to/SliceCheck` with where you cloned it.

**Claude Desktop** (`claude_desktop_config.json`):
```json
{ "mcpServers": { "slicecheck": { "command": "node", "args": ["/path/to/SliceCheck/mcp/server.mjs"] } } }
```

**VS Code with GitHub Copilot** (`.vscode/mcp.json`):
```json
{ "servers": { "slicecheck": { "type": "stdio", "command": "node", "args": ["/path/to/SliceCheck/mcp/server.mjs"] } } }
```

**Cursor** (`~/.cursor/mcp.json`):
```json
{ "mcpServers": { "slicecheck": { "command": "node", "args": ["/path/to/SliceCheck/mcp/server.mjs"] } } }
```

**Claude Code:**
```bash
claude mcp add slicecheck -- node /path/to/SliceCheck/mcp/server.mjs
```

## Your team's rules

The server uses, in order:
1. the file in the `SLICECHECK_RULES` environment variable,
2. `slicecheck.rules.yaml` in the folder the AI app runs from,
3. the default `rules.yaml`.

Rules are re-read on every review, so edits apply right away.

## Not yet supported

ChatGPT and Microsoft Copilot Studio connect to MCP servers over the web, not on your machine. That needs a hosted version, which means tickets would leave your machine. It's planned, with a self-hosting option for teams.
