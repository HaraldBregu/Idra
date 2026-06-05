# Google Calendar Connector

Friday's Google Calendar connector lists calendars and searches, reads, creates,
updates, and deletes calendar events through local Google OAuth and local API
execution.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Connector id        | `connector_googlecalendar`                                                    |
| Direct connector id | `google_calendar`                                                             |
| Runtime status      | Dynamic MCP tools                                          |
| Auth kind           | Google OAuth                                                                  |
| Redirect URI        | `http://127.0.0.1:<temporary-port>`                                           |
| Setup URL           | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

## Implementation

The catalog entry is defined in
the dynamic connector catalog returned by the connectors API. Local
execution is implemented by `ConnectorsService` with a Calendar runtime strategy
and API helpers in
[`src/main/agent/connectors/mcp-client.ts`](../../src/main/agent/connectors/mcp-client.ts).

OAuth uses the same Google installed-app flow as Gmail: loopback redirect,
browser consent, PKCE, state validation, token exchange, refresh, and secret
redaction. `allowedTools` controls generated tools and whether Friday requests
only read scopes or also the write event scope.

Agent tool names are generated as `<serverLabel>_<toolName>`, for example
`google_calendar_search_events`.

## Tools

- `get_profile`
- `list_calendars`
- `search`
- `fetch`
- `search_events`
- `read_event`
- `create_event`
- `update_event`
- `delete_event`

## Scopes

- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/calendar.events`

Friday includes profile and read scopes by default. It adds
`calendar.events` when `create_event`, `update_event`, or `delete_event` is
enabled.

## API Coverage

The Google Calendar API is the official REST API for accessing Calendar features
through HTTP calls or Google client libraries. Friday calls resources under
`https://www.googleapis.com/calendar/v3`.

- `list_calendars` calls `users/me/calendarList`.
- `search` and `search_events` call `events.list`.
- `fetch` and `read_event` call `events.get`.
- `create_event` calls `events.insert`.
- `update_event` calls `events.patch`.
- `delete_event` calls `events.delete`.

## Setup

1. Enable the Google Calendar API in the Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth client with application type Desktop app.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
   launching Friday.
5. Add the connector in Settings, keep `allowedTools` as small as practical,
   save, then use Connect to finish Google consent.

## Input Notes

- `calendarId` defaults to `primary`.
- `search` and `search_events` accept `query`, `timeMin`, `timeMax`,
  `maxResults`, `pageToken`, `showDeleted`, `singleEvents`, and `orderBy`.
- `fetch`, `read_event`, and `delete_event` accept `eventId` or `id`.
- `create_event` requires `summary`, `start`, and `end`; `title` is accepted as
  an alias for `summary`.
- `update_event` requires `eventId` and at least one event field.

## Safety Notes

- Creating, updating, and deleting events can invite users, change meeting
  details, or remove calendar records. Keep write tools disabled until a
  workflow needs them.
- Confirm timezone, attendees, and recurrence before creating or modifying
  events.

## Official Documentation

- [Google Calendar API overview](https://developers.google.com/workspace/calendar/api/guides/overview)
- [Google Calendar API reference](https://developers.google.com/workspace/calendar/api/v3/reference)
- [Google OAuth 2.0 for iOS and Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google OAuth 2.0 scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

## Related Source

- [`src/main/agent/connectors/service.ts`](../../src/main/agent/connectors/service.ts)
- [`src/main/agent/connectors/mcp-client.ts`](../../src/main/agent/connectors/mcp-client.ts)
- [`docs/providers/google/calendar/index.md`](../providers/google/calendar/index.md)
