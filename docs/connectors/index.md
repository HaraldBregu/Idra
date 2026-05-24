# Connector Implementation Reference

This folder documents the provider connectors exposed by Friday's active
connector catalog. It covers the catalog entries in `OPENAI_CONNECTOR_CATALOG`,
not the broader direct-connector planning list.

Official provider documentation was checked on 2026-05-24.

## Runtime Summary

| Connector | Runtime status | Auth model | Guide |
| --- | --- | --- | --- |
| Dropbox | Settings catalog only | Manual OAuth access token | [Dropbox](dropbox.md) |
| Gmail | Local OAuth and local tool execution | Google OAuth with PKCE loopback | [Gmail](gmail.md) |
| Google Calendar | Local OAuth and local tool execution | Google OAuth with PKCE loopback | [Google Calendar](google-calendar.md) |
| Google Drive | Local OAuth and local tool execution | Google OAuth with PKCE loopback | [Google Drive](google-drive.md) |
| Microsoft Teams | Settings catalog only | Manual Microsoft Graph OAuth token | [Microsoft Teams](microsoft-teams.md) |
| Outlook Calendar | Settings catalog only | Manual Microsoft Graph OAuth token | [Outlook Calendar](outlook-calendar.md) |
| Outlook Email | Settings catalog only | Manual Microsoft Graph OAuth token | [Outlook Email](outlook-email.md) |
| SharePoint | Settings catalog only | Manual Microsoft Graph OAuth token | [SharePoint](sharepoint.md) |

## Shared Runtime Behavior

- Connector catalog metadata lives in
  [`src/shared/connector/connectors.ts`](../../src/shared/connector/connectors.ts).
- Provider docs metadata and runtime status labels live in
  [`src/shared/connector/provider-docs.ts`](../../src/shared/connector/provider-docs.ts).
- The production connector facade is
  [`ConnectorsService`](../../src/main/connectors/service.ts).
- Gmail, Google Calendar, and Google Drive have local runtime strategies and are
  exposed as local agent tools when enabled, configured, and authorized.
- Dropbox and Microsoft connectors currently provide settings/catalog metadata
  only. They can store a manual OAuth access token, but local agent tool
  execution is not implemented until a runtime strategy, MCP server,
  provider-hosted connector, or plugin implementation is added.

## Related Docs

- [Connectors and MCP feature overview](../features/connectors.md)
- [Google provider docs](../providers/google/index.md)
- [Microsoft provider docs](../providers/microsoft/index.md)
- [Dropbox provider docs](../providers/dropbox/index.md)
