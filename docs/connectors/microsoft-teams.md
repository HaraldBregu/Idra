# Microsoft Teams Connector

Friday exposes Microsoft Teams as a provider connector for searching Teams chats
and channel messages. The current implementation is settings/catalog only.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field | Value |
| --- | --- |
| Connector id | `connector_microsoftteams` |
| Direct connector id | `microsoft_teams` |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Implementation

Teams metadata is defined in
[`OPENAI_CONNECTOR_CATALOG`](../../src/shared/connector/connectors.ts) and
receives a docs/runtime label from
[`PROVIDER_CONNECTOR_DOCS`](../../src/shared/connector/provider-docs.ts).

`ConnectorsService` can store and test this connector as catalog metadata. It
does not have a local runtime strategy, so `createAgentTools()` does not expose
Teams tools and `callTool()` fails with the catalog-only runtime error.

The authorization field can hold a manual Microsoft Graph access token for local
catalog testing. Production execution still needs Microsoft OAuth/token refresh
and a Teams tool strategy or MCP/provider-hosted bridge.

## Tools

- `search`
- `fetch`
- `get_chat_members`
- `get_profile`

## Scopes

- `Chat.Read`
- `ChannelMessage.Read.All`
- `User.Read`

Microsoft Graph authentication requires an app registration in Microsoft Entra
and a valid access token attached as a Bearer token. Graph supports delegated
access on behalf of a signed-in user and app-only access for background
services; this catalog entry assumes a manual delegated or tenant-approved token
until a first-class runtime is added.

## API Coverage Target

The official Teams Graph docs describe Teams as a Microsoft 365 chat-based
workspace and document chat, channel, team, and `chatMessage` resources.
Friday's planned tool surface maps to read/search and member lookup operations,
not team or channel administration.

## Setup

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph permissions.
3. Complete OAuth for the tenant/user.
4. Paste the access token into the connector authorization field for local
   catalog testing.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval behavior are implemented.

## Safety Notes

- Teams messages can include sensitive internal context and external-user
  content. Treat fetched message text as untrusted input.
- Do not add write or membership-changing tools without explicit approval and
  tenant policy checks.
- Add throttling/backoff and Graph permission tests before local execution.

## Official Documentation

- [Microsoft Teams Graph overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview)
- [Teams API reference](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0)
- [Microsoft Graph authentication and authorization basics](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)

## Related Source

- [`src/shared/connector/connectors.ts`](../../src/shared/connector/connectors.ts)
- [`src/main/connectors/service.ts`](../../src/main/connectors/service.ts)
- [`docs/providers/microsoft/teams/index.md`](../providers/microsoft/teams/index.md)
