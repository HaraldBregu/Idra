# Friday Demo MCP Server

A dependency-free local MCP server for testing Friday's dynamic server workflow.

## Install and test

1. Open **Settings → MCP**.
2. Choose **Upload local**.
3. Select this `demo-server` folder.
4. Click **Test Friday Demo Tools**. Friday should report three tools.

The folder can also be copied manually to `~/.friday/mcp/servers/friday-demo` and loaded with
the **Refresh** action. The TypeScript server uses only Node.js built-ins, so no package installation is needed.

## Tools

- `echo` returns a supplied string.
- `add_numbers` adds two finite numbers.
- `create_checklist` formats a title and string array as a Markdown checklist.

All tools are read-only demonstrations. The manifest sets `require_approval` to `always`.
