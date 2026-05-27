# Gmail Connector

Catalog and runtime notes for Friday's Gmail connector.

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Connector id        | `google.gmail`                                                             |
| Direct connector id | `gmail`                                                                       |
| Name                | Gmail                                                                         |
| Runtime status      | Dynamic MCP tools                                          |
| Auth kind           | Google OAuth                                                                  |
| Redirect URI        | `http://127.0.0.1:<temporary-port>`                                           |
| Setup URL           | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

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

## Setup Checklist

1. Enable the Gmail API in the target Google Cloud project.
2. Configure the OAuth consent screen.
3. Create a Desktop app OAuth client.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
   launching Friday.
5. Add the connector in Settings, select the smallest useful `allowedTools`
   list, save it, then use Connect to finish Google consent.

## Runtime Notes

- Friday opens the system browser and receives the OAuth callback on a temporary
  local loopback port.
- `allowedTools` controls both the generated local tools and the Gmail scopes
  requested during consent. Leaving it empty enables every Gmail tool and all
  listed Gmail scopes.
- With the default server label `gmail`, local agent tools are exposed as
  `gmail_search_emails`, `gmail_read_email`, `gmail_create_draft`, and similar
  names.
- `send_email` sends mail and `trash_email` mutates the mailbox. Keep those
  tools disabled unless the workflow really needs them.

## Input Notes

- `search_emails` and `search_email_ids` accept `query`, `maxResults`,
  `pageToken`, `labelIds`, and `includeSpamTrash`.
- `read_email` and `trash_email` accept `id` or `messageId`.
- `batch_read_email` accepts up to 10 ids.
- `create_draft` and `send_email` require `to`, `subject`, and `body`; `cc`,
  `bcc`, and `isHtml` are optional.

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

- [Google provider](../index.md)
