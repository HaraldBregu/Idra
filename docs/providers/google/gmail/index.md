# Gmail Connector

Provider-scoped entry for Friday's Gmail connector.

| Field | Value |
| --- | --- |
| Provider | [Google](../index.md) |
| Connector id | `connector_gmail` |
| Direct connector id | `gmail` |
| Runtime status | Local Google OAuth and local tool execution |
| Auth kind | Google OAuth |
| Canonical connector doc | [connectors/gmail.md](../../../connectors/gmail.md) |

## Environment Secrets

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

## Tools

- `get_profile`
- `search_emails`
- `search_email_ids`
- `get_recent_emails`
- `read_email`
- `batch_read_email`
- `create_draft`
- `send_email`
- `trash_email`

## Related Docs

- [Google provider](../index.md)
- [Connector subsystem](../../../connectors/index.md)
