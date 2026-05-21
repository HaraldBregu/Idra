# Outlook Email Connector

Catalog metadata for Friday's Outlook Email connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_outlookemail` |
| Direct connector id | `outlook` |
| Name | Outlook Email |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

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

- [Connector subsystem](index.md)
