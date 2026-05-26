# Outlook Email Connector

Friday exposes Outlook Email as a provider connector for searching and reading
mail messages. The current implementation is settings/catalog only.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Connector id        | `connector_outlookemail`                                                                                                  |
| Direct connector id | `outlook`                                                                                                                 |
| Runtime status      | Settings catalog only                                                                                                     |
| Auth kind           | Manual OAuth access token                                                                                                 |
| Setup URL           | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Implementation

Outlook Email metadata is defined in
[`OPENAI_CONNECTOR_CATALOG`](../../src/shared/connector/connectors.ts) and
receives a docs/runtime label from
[`PROVIDER_CONNECTOR_DOCS`](../../src/shared/connector/provider-docs.ts).

`ConnectorsService` can store and test this connector as catalog metadata. It
does not have a local runtime strategy, so `createAgentTools()` does not expose
Outlook Email tools and `callTool()` fails with the catalog-only runtime error.

The authorization field can hold a manual Microsoft Graph access token for local
catalog testing. Production execution still needs Microsoft OAuth/token refresh
and an Outlook Mail tool strategy or MCP/provider-hosted bridge.

## Tools

- `get_profile`
- `list_messages`
- `search_messages`
- `get_recent_emails`
- `fetch_message`
- `fetch_messages_batch`

## Scopes

- `User.Read`
- `Mail.Read`

Microsoft Graph authentication requires an app registration in Microsoft Entra
and a valid access token attached as a Bearer token. For this read-only catalog
surface, delegated permissions should be preferred unless the deployment has a
clear tenant-admin-approved app-only requirement.

## API Coverage Target

The official Outlook Mail docs describe Outlook as the Microsoft 365 messaging
hub and Microsoft Graph as the API surface for filtering, searching, sorting,
and reading messages in mailbox folders. Friday's planned tool surface maps to
message listing/searching, recent-message reads, single-message fetch, and batch
fetch.

## Setup

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph mail permissions.
3. Complete OAuth for the mailbox account.
4. Paste the access token into the connector authorization field for local
   catalog testing.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval behavior are implemented.

## Safety Notes

- Treat message bodies and attachments as untrusted input.
- Do not add send, delete, or rule-management tools without explicit approval
  gates.
- Add Graph throttling/backoff, pagination, projection, redaction, and mailbox
  permission tests before local execution.

## Official Documentation

- [Outlook mail API overview](https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview)
- [Microsoft Graph authentication and authorization basics](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)

## Related Source

- [`src/shared/connector/connectors.ts`](../../src/shared/connector/connectors.ts)
- [`src/main/connectors/service.ts`](../../src/main/connectors/service.ts)
- [`docs/providers/microsoft/outlook-email/index.md`](../providers/microsoft/outlook-email/index.md)
