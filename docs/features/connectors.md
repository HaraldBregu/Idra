# Connectors And MCP

Connectors let Friday integrate with external services through pluggable MCP servers. A connector record stores connection metadata, MCP transport config, approval policy, and the last discovered tool inventory. The actual executable tools come from the MCP server at runtime.

## Dynamic MCP Connectors

Friday supports remote Streamable HTTP MCP servers and local stdio MCP servers. When a connector is saved or refreshed, the main process uses the official MCP SDK client to connect, list server tools, and store the discovered tool metadata. Agent runs then expose those discovered tools as connector tools.

Secrets are not stored in connector records. If a remote MCP server needs an API key or bearer token, the connector config stores only the environment variable name, such as `REMOTE_MCP_API_KEY`; the main process resolves the value from the app environment when it connects.

## Catalog

The shared connector catalog still lists provider-oriented entries such as Gmail, Google Calendar, Google Drive, Dropbox, Microsoft Teams, Outlook Calendar, Outlook Email, SharePoint, plus generic remote and stdio MCP connector entries. These catalog entries are starting points for configuration; the connected MCP server owns the real tool list. Multiple connector records can use the same provider id.

## Runtime

Connector configuration is stored in the dedicated Electron Store named `connector` under the `connectors` key. The active runtime lives under `src/main/agent/connectors` and uses an MCP client adapter so tests can inject fake clients and production can use the official SDK transports.

The MCP registry can also translate enabled connector records into harness MCP server configs, so the agent harness can materialize server tools through the same MCP discovery path.

## Source

- `src/main/agent/connectors`
- `src/main/agent/mcp`
- `src/main/agent/harness/mcp.ts`
- `src/shared/connector`
- `src/renderer/src/pages/settings/pages/connectors`
- Provider docs: `docs/providers/google/index.md`, `docs/providers/microsoft/index.md`, `docs/providers/dropbox/index.md`, `docs/providers/mcp/remote/index.md`, `docs/providers/mcp/stdio/index.md`
