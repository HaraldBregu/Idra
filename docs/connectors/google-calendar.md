# Google Calendar Connector

Catalog metadata for Friday's Google Calendar connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_googlecalendar` |
| Direct connector id | `google_calendar` |
| Name | Google Calendar |
| Runtime status | Local OAuth and API-client execution path |
| Auth kind | Google OAuth |
| Redirect URI | `http://127.0.0.1:<temporary-port>` |
| Setup URL | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

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
