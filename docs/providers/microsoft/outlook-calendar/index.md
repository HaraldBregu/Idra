# Outlook Calendar Connector

Provider-scoped entry for Friday's Outlook Calendar connector.

| Field | Value |
| --- | --- |
| Provider | [Microsoft](../index.md) |
| Connector id | `connector_outlookcalendar` |
| Direct connector id | `outlook` |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Canonical connector doc | [connectors/outlook-calendar.md](../../../connectors/outlook-calendar.md) |

## Environment Secrets

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_OUTLOOK_CALENDAR_ACCESS_TOKEN`

## Tools

- `search_events`
- `fetch_event`
- `fetch_events_batch`
- `list_events`
- `get_profile`

## Related Docs

- [Microsoft provider](../index.md)
- [Connector subsystem](../../../connectors/index.md)
