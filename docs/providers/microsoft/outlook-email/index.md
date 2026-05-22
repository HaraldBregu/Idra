# Outlook Email Connector

Provider-scoped entry for Friday's Outlook Email connector.

| Field | Value |
| --- | --- |
| Provider | [Microsoft](../index.md) |
| Connector id | `connector_outlookemail` |
| Direct connector id | `outlook` |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Canonical connector doc | [connectors/outlook-email.md](../../../connectors/outlook-email.md) |

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

## Related Docs

- [Microsoft provider](../index.md)
- [Connector subsystem](../../../connectors/index.md)
