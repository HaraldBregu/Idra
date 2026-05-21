# Gmail Connector

Catalog metadata for Friday's Gmail connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_gmail` |
| Direct connector id | `gmail` |
| Name | Gmail |
| Runtime status | Local OAuth and API-client execution path |
| Auth kind | Google OAuth |
| Redirect URI | `http://127.0.0.1:<temporary-port>` |
| Setup URL | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

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

## Scopes

- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.modify`

## Example

Search mail:

```json
{ "query": "from:alice@example.com newer_than:7d" }
```

Use with `search_emails`.

## Platform Documentation

- [Gmail API guides](https://developers.google.com/workspace/gmail/api/guides)
- [Gmail API reference](https://developers.google.com/workspace/gmail/api/reference/rest)

## Related Docs

- [Connector subsystem](index.md)
