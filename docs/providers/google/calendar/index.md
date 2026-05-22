# Google Calendar Connector

Catalog and runtime notes for Friday's Google Calendar connector.

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Connector id        | `connector_googlecalendar`                                                    |
| Direct connector id | `google_calendar`                                                             |
| Name                | Google Calendar                                                               |
| Runtime status      | Local OAuth and local tool execution                                          |
| Auth kind           | Google OAuth                                                                  |
| Redirect URI        | `http://127.0.0.1:<temporary-port>`                                           |
| Setup URL           | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

## Environment Secrets

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

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

## Setup Checklist

1. Enable the Google Calendar API in the target Google Cloud project.
2. Configure the OAuth consent screen.
3. Create a Desktop app OAuth client.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
   launching Friday.
5. Add the connector in Settings, select the smallest useful `allowedTools`
   list, save it, then use Connect to finish Google consent.

## Runtime Notes

- Friday opens the system browser and receives the OAuth callback on a temporary
  local loopback port.
- `allowedTools` controls both the generated local tools and the Calendar scopes
  requested during consent. Leaving it empty enables every Calendar tool and all
  listed Calendar scopes.
- With the default server label `google_calendar`, local agent tools are exposed
  as `google_calendar_search_events`, `google_calendar_read_event`, and similar
  names.
- `create_event`, `update_event`, and `delete_event` mutate calendars. Keep them
  disabled unless the workflow really needs calendar writes.

## Input Notes

- `calendarId` defaults to `primary`.
- `search` and `search_events` accept `query`, `timeMin`, `timeMax`,
  `maxResults`, `pageToken`, `showDeleted`, `singleEvents`, and `orderBy`.
- `fetch`, `read_event`, and `delete_event` accept `eventId` or `id`.
- `create_event` requires `summary`, `start`, and `end`. `title` is accepted as
  an alias for `summary`.
- `update_event` requires `eventId` and at least one event field.

## Example

Find events:

```json
{ "query": "planning", "calendarId": "primary" }
```

Use with `search_events`.

## Platform Documentation

- [Google Calendar API overview](https://developers.google.com/workspace/calendar/api/guides/overview)
- [Calendar API reference](https://developers.google.com/workspace/calendar/api/v3/reference)

## Related Docs

- [Connector subsystem](index.md)
