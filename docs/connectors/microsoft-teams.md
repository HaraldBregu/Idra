# Microsoft Teams Connector

Catalog metadata for Friday's Microsoft Teams connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_microsoftteams` |
| Direct connector id | `microsoft_teams` |
| Name | Microsoft Teams |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Environment Secrets

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TEAMS_ACCESS_TOKEN`

## Tools

- `search`
- `fetch`
- `get_chat_members`
- `get_profile`

## Scopes

- `Chat.Read`
- `ChannelMessage.Read.All`
- `User.Read`

## Example

Search messages:

```json
{ "query": "deployment incident" }
```

Use with `search`.

## Platform Documentation

- [Microsoft Teams Graph overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview)
- [Teams API reference](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0)

## Related Docs

- [Connector subsystem](index.md)
