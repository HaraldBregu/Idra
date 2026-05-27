# Connector Implementation Reference

This folder documents the provider connector catalog exposed by Friday. Catalog entries are configuration starting points; runtime tools are discovered from the MCP server configured for each connector record.

Official provider documentation was checked on 2026-05-24.

## Runtime Summary

| Connector family | Runtime status | Auth model |
| --- | --- | --- |
| Provider catalog entries | Dynamic MCP tools | Environment-variable secret references in MCP config |
| Remote MCP Server | Dynamic MCP tools | Optional HTTP bearer/API-key env var reference |
| Local MCP Server | Dynamic MCP tools | Optional stdio env var mappings |

## Shared Runtime Behavior

- Connector catalog metadata lives in src/shared/connector/connectors.ts.
- Provider docs metadata and runtime status labels live in src/shared/connector/provider-docs.ts.
- The production connector facade is src/main/agent/connectors/service.ts.
- Connector records are stored as a dynamic array in the dedicated Electron Store named connector.
- Tool metadata is refreshed from the connected MCP server with the official MCP SDK client.
- Secrets are not pasted into connector records; connector config references environment variable names.

## Related Docs

- [Connectors and MCP feature overview](../features/connectors.md)
- [Google provider docs](../providers/google/index.md)
- [Microsoft provider docs](../providers/microsoft/index.md)
- [Dropbox provider docs](../providers/dropbox/index.md)
- [Remote MCP provider docs](../providers/mcp/remote/index.md)
- [Local MCP provider docs](../providers/mcp/stdio/index.md)
