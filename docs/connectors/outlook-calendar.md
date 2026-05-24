# Outlook Calendar Connector

Friday exposes Outlook Calendar as a provider connector for searching and
reading calendar events. The current implementation is settings/catalog only.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field | Value |
| --- | --- |
| Connector id | `connector_outlookcalendar` |
| Direct connector id | `outlook` |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Implementation

Outlook Calendar metadata is defined in
[`OPENAI_CONNECTOR_CATALOG`](../../src/shared/connector/connectors.ts) and
receives a docs/runtime label from
[`PROVIDER_CONNECTOR_DOCS`](../../src/shared/connector/provider-docs.ts).

`ConnectorsService` can store and test this connector as catalog metadata. It
does not have a local runtime strategy, so `createAgentTools()` does not expose
Outlook Calendar tools and `callTool()` fails with the catalog-only runtime
error.

The authorization field can hold a manual Microsoft Graph access token for local
catalog testing. Production execution still needs Microsoft OAuth/token refresh
and an Outlook Calendar tool strategy or MCP/provider-hosted bridge.

## Tools

- `search_events`
- `fetch_event`
- `fetch_events_batch`
- `list_events`
- `get_profile`

## Scopes

- `Calendars.Read`
- `User.Read`

Microsoft Graph authentication requires an app registration in Microsoft Entra
and a valid access token attached as a Bearer token. For this read-only catalog
surface, delegated permissions should be preferred unless the deployment has a
clear tenant-admin-approved app-only requirement.

## API Coverage Target

The official Outlook Calendar docs describe events, calendar folders, recurring
events, meeting requests, reminders, and calendar synchronization. Friday's
planned tool surface maps to listing/searching events and fetching individual or
batched event records.

## Setup

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph calendar permissions.
3. Complete OAuth for the account.
4. Paste the access token into the connector authorization field for local
   catalog testing.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval behavior are implemented.

## Safety Notes

- Calendar data can expose private attendees, locations, agenda details, and
  meeting links. Treat fetched event data as private.
- Do not add event create/update/delete tools without explicit human approval
  and recurrence/timezone confirmation.
- Add Graph throttling/backoff and permission tests before local execution.

## Official Documentation

- [Outlook calendar API overview](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview)
- [Microsoft Graph authentication and authorization basics](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)

## Related Source

- [`src/shared/connector/connectors.ts`](../../src/shared/connector/connectors.ts)
- [`src/main/connectors/service.ts`](../../src/main/connectors/service.ts)
- [`docs/providers/microsoft/outlook-calendar/index.md`](../providers/microsoft/outlook-calendar/index.md)
