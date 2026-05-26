# SharePoint Connector

Friday exposes SharePoint as a provider connector for searching and fetching
SharePoint and OneDrive documents. The current implementation is
settings/catalog only.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Connector id        | `connector_sharepoint`                                                                                                    |
| Direct connector id | `sharepoint_onedrive`                                                                                                     |
| Runtime status      | Settings catalog only                                                                                                     |
| Auth kind           | Manual OAuth access token                                                                                                 |
| Setup URL           | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Implementation

SharePoint metadata is defined in
[`OPENAI_CONNECTOR_CATALOG`](../../src/shared/connector/connectors.ts) and
receives a docs/runtime label from
[`PROVIDER_CONNECTOR_DOCS`](../../src/shared/connector/provider-docs.ts).

`ConnectorsService` can store and test this connector as catalog metadata. It
does not have a local runtime strategy, so `createAgentTools()` does not expose
SharePoint tools and `callTool()` fails with the catalog-only runtime error.

The authorization field can hold a manual Microsoft Graph access token for local
catalog testing. Production execution still needs Microsoft OAuth/token refresh
and a SharePoint/OneDrive tool strategy or MCP/provider-hosted bridge.

## Tools

- `get_site`
- `search`
- `list_recent_documents`
- `fetch`
- `get_profile`

## Scopes

- `Sites.Read.All`
- `Files.Read.All`
- `User.Read`

Microsoft Graph authentication requires an app registration in Microsoft Entra
and a valid access token attached as a Bearer token. `Sites.Read.All` and
`Files.Read.All` can expose broad tenant data, so tenant-admin review and
least-privilege design are required before production use.

## API Coverage Target

The official OneDrive and SharePoint Graph docs describe Drive and DriveItem
resources for files across OneDrive, OneDrive for Business, and SharePoint
document libraries. SharePoint sites are addressable through `/sites/root`,
`/sites/{site-id}`, `/sites/{site-id}/drive`, and related paths. Friday's
planned tool surface maps to site lookup, document search, recent-document list,
and document fetch.

## Setup

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph files and sites permissions.
3. Complete OAuth for the account or tenant-approved app.
4. Paste the access token into the connector authorization field for local
   catalog testing.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval behavior are implemented.

## Safety Notes

- Preserve SharePoint and OneDrive ACLs in search and retrieval paths.
- Treat document content as untrusted input.
- Add tenant scoping, sensitivity-label handling, throttling/backoff,
  projection, and redaction tests before local execution.

## Official Documentation

- [Working with files in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0)
- [Working with SharePoint sites in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0)
- [Microsoft Graph authentication and authorization basics](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)

## Related Source

- [`src/shared/connector/connectors.ts`](../../src/shared/connector/connectors.ts)
- [`src/main/connectors/service.ts`](../../src/main/connectors/service.ts)
- [`docs/providers/microsoft/sharepoint/index.md`](../providers/microsoft/sharepoint/index.md)
