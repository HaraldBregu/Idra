# Connectors And MCP

Connectors let Friday integrate with external accounts, provider-hosted connector tools, MCP servers, and plugin-provided runtime surfaces.

## Local Google Connectors

Friday has local runtime strategies for:

- Gmail
- Google Calendar
- Google Drive

These connectors support OAuth with a local loopback callback, PKCE, token refresh, account profile lookup, secret redaction on public reads, and agent tool creation for enabled configured connectors.

Available Google tool coverage includes:

- Gmail: profile, search message ids, recent/search emails, read email, batch read email, create draft, send email, trash email.
- Google Calendar: profile, list calendars, search events, read/fetch event, create event, update event, delete event.
- Google Drive: profile, list drives, search files, recent files, file metadata, file permissions, read/download content, create file.

Google Drive `create_file` requires approval unless connector approval settings explicitly disable that requirement.

## Catalog And Provider-Hosted Connectors

The connector catalog includes entries such as Dropbox, Gmail, Google Calendar, Google Drive, Microsoft Teams, Outlook Calendar, Outlook Email, and SharePoint. The broader direct connector planning catalog also describes many productivity, developer, business, data, and automation integrations.

Only Gmail, Google Calendar, and Google Drive have local execution strategies in the current source. Other catalog entries can be configured as catalog/provider-hosted surfaces, but local agent execution needs a runtime strategy, MCP server, provider-hosted connector, or plugin implementation.

## MCP And Plugin Extension

The MCP registry can build OpenAI Responses API MCP tool descriptors from enabled connector configuration. The tool runtime can also materialize MCP tools when an MCP runtime is supplied and the agent tool allowlist includes MCP tools.

Plugin manifests can declare providers, channels, tools, hooks, model catalogs, auth choices, runtime entries, setup entries, and activation capabilities. Plugin discovery scans for `friday.plugin.json`, normalizes manifests, blocks unsafe paths, and supports bundled, installed, and workspace origins.

## Source

- `src/main/connectors`
- `src/main/mcp`
- `src/main/plugins`
- `src/shared/connector`
- `src/renderer/src/pages/settings/pages/connectors`
- Existing docs: `docs/providers/google/index.md`, `docs/providers/microsoft/index.md`, `docs/providers/dropbox/index.md`

