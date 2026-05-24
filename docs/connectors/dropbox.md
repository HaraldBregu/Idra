# Dropbox Connector

Friday exposes Dropbox as a provider connector for searching and fetching files.
The current implementation is settings/catalog only.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field | Value |
| --- | --- |
| Connector id | `connector_dropbox` |
| Direct connector id | `dropbox` |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Dropbox App Console](https://www.dropbox.com/developers/apps) |

## Implementation

Dropbox metadata is defined in
[`OPENAI_CONNECTOR_CATALOG`](../../src/shared/connector/connectors.ts) and
receives a docs/runtime label from
[`PROVIDER_CONNECTOR_DOCS`](../../src/shared/connector/provider-docs.ts).

`ConnectorsService` can add, update, enable, disable, test, and list this
connector because it is in the shared catalog. It does not have a local runtime
strategy in `runtimeStrategies`, so `createAgentTools()` does not expose Dropbox
tools and `callTool()` fails with the catalog-only runtime error.

The access-token field can hold a manual Dropbox OAuth token for local catalog
testing. Production execution still needs a real credential flow plus a Dropbox
tool strategy or an MCP/provider-hosted bridge.

## Tools

- `search`
- `fetch`
- `search_files`
- `fetch_file`
- `list_recent_files`
- `get_profile`

## Scopes

- `files.metadata.read`
- `files.content.read`
- `account_info.read`

The Dropbox OAuth guide states that API access is authorized with OAuth 2.0 and
that scopes selected in the App Console determine which API calls a token can
execute. It also recommends minimal permissions and PKCE for desktop or mobile
apps that cannot protect a client secret.

## Setup

1. Create or open a Dropbox app in the App Console.
2. Enable the listed file metadata, file content, and account-info scopes.
3. Complete OAuth for the Dropbox account.
4. Paste the access token into the connector authorization field for local
   catalog testing.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval handling exist.

## Safety Notes

- Treat Dropbox file contents as untrusted input before passing them to an
  agent.
- Prefer app-folder access when the workflow does not require full Dropbox
  access.
- Add token refresh, revocation handling, output projection, and redaction tests
  before making this a local executable connector.

## Official Documentation

- [Dropbox for HTTP Developers](https://www.dropbox.com/developers/documentation/http/overview)
- [Dropbox OAuth guide](https://developers.dropbox.com/oauth-guide)

## Related Source

- [`src/shared/connector/connectors.ts`](../../src/shared/connector/connectors.ts)
- [`src/main/connectors/service.ts`](../../src/main/connectors/service.ts)
