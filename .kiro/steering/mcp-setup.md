---
inclusion: manual
---

# MCP Setup

## GitHub MCP Server

The GitHub MCP server is configured at the **user level** in `~/.kiro/settings/mcp.json`.

### Correct Configuration
The official GitHub MCP server (`github/github-mcp-server`) runs as a **Docker container** — it is NOT a Python/uvx package. The correct config is:

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Requirements
- **Docker** must be installed and running (`docker --version` to verify)
- A GitHub Personal Access Token with appropriate scopes (at minimum `repo`)
- The Docker image `ghcr.io/github/github-mcp-server` is public and will be pulled automatically on first run

### Common Mistakes
- `uvx mcp-server-github` — this package does not exist on PyPI, do not use it
- `npx @modelcontextprotocol/server-github` — this is a different community server, not the official one

### Reconnecting
After editing `~/.kiro/settings/mcp.json`, reconnect from the MCP Server view in the Kiro feature panel, or search "MCP" in the command palette.

### Testing the Connection
Use the `mcp_github_get_me` tool to verify the connection is working. It requires no parameters and returns the authenticated user's profile.
