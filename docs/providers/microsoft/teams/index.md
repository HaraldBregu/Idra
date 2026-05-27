# Microsoft Teams Connector

Catalog notes for Friday's Microsoft Teams connector.

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Connector id        | `connector_microsoftteams`                                                                                                |
| Direct connector id | `microsoft_teams`                                                                                                         |
| Name                | Microsoft Teams                                                                                                           |
| Runtime status      | Settings catalog only                                                                                                     |
| Auth kind           | MCP env variables                                                                                                 |
| Setup URL           | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

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

## Current Runtime

Microsoft Teams is present in the Settings catalog with setup metadata, scopes,
and tool names. It does not have a local `ConnectorToolStrategy` yet, so default
agent tool execution is not implemented for this connector.

The MCP config env reference can store a manual Microsoft Graph OAuth access
token for local development. For production work, add a real OAuth or
secret-backed credential flow before relying on this connector.

## Setup Checklist

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph permissions and complete any required admin
   consent for tenant-wide scopes.
3. Complete OAuth for the tenant/user.
4. Paste the access token into the MCP config env reference only for
   local development.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval behavior are implemented.

## Implementation Work Remaining

- Add Microsoft OAuth and token refresh handling.
- Add a local tool strategy in `ConnectorsService`.
- Add typed schemas, output projection, redaction tests, and at least one
  representative read test.

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

- [Microsoft provider](../index.md)
