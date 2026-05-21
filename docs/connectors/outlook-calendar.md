# Outlook Calendar Connector

Catalog metadata for Friday's Outlook Calendar connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_outlookcalendar` |
| Direct connector id | `outlook` |
| Name | Outlook Calendar |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

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

## Scopes

- `Calendars.Read`
- `User.Read`

## Example

List events:

```json
{ "calendarId": "primary" }
```

Use with `list_events`.

## Platform Documentation

- [Outlook calendar API overview](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview)
- [Microsoft Graph auth concepts](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)

## Related Docs

- [Connector subsystem](index.md)
