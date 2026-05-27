# Outlook Email Connector

Catalog notes for Friday's Outlook Email connector.

| Field               | Value                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Connector id        | `connector_outlookemail`                                                                                                  |
| Direct connector id | `outlook`                                                                                                                 |
| Name                | Outlook Email                                                                                                             |
| Runtime status      | Settings catalog only                                                                                                     |
| Auth kind           | MCP env variables                                                                                                 |
| Setup URL           | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Environment Secrets

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_OUTLOOK_EMAIL_ACCESS_TOKEN`

## Tools

- `get_profile`
- `list_messages`
- `search_messages`
- `get_recent_emails`
- `fetch_message`
- `fetch_messages_batch`

## Scopes

- `User.Read`
- `Mail.Read`

## Current Runtime

Outlook Email is present in the Settings catalog with setup metadata, scopes,
and tool names. It does not have a local `ConnectorToolStrategy` yet, so default
agent tool execution is not implemented for this connector.

The MCP config env reference can store a manual Microsoft Graph OAuth access
token for local development. For production work, add a real OAuth or
secret-backed credential flow before relying on this connector.

## Setup Checklist

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph mail permissions.
3. Complete OAuth for the mailbox account.
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
{ "query": "invoice hasAttachments:true" }
```

Use with `search_messages`.

## Platform Documentation

- [Outlook mail API overview](https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview)
- [Microsoft Graph auth concepts](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)

## Related Docs

- [Microsoft provider](../index.md)
