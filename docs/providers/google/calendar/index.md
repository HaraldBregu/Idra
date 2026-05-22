# Google Calendar Connector

Provider-scoped entry for Friday's Google Calendar connector.

| Field | Value |
| --- | --- |
| Provider | [Google](../index.md) |
| Connector id | `connector_googlecalendar` |
| Direct connector id | `google_calendar` |
| Runtime status | Local Google OAuth and local tool execution |
| Auth kind | Google OAuth |
| Canonical connector doc | [connectors/google-calendar.md](../../../connectors/google-calendar.md) |

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

## Related Docs

- [Google provider](../index.md)
- [Connector subsystem](../../../connectors/index.md)
