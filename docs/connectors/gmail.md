# Gmail Connector

Friday's Gmail connector searches, reads, drafts, sends, and trashes Gmail
messages through dynamic MCP tool discovery.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Connector id        | `google.gmail`                                                             |
| Direct connector id | `gmail`                                                                       |
| Runtime status      | Dynamic MCP tools                                          |
| Auth kind           | Google OAuth                                                                  |
| Redirect URI        | `http://127.0.0.1:<temporary-port>`                                           |
| Setup URL           | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

## Implementation

The catalog entry is defined in
the dynamic connector catalog returned by the connectors API. Local
execution is implemented by `ConnectorsService` with a Gmail runtime strategy
and API helpers in
[`src/main/agent/connectors/mcp-client.ts`](../../src/main/agent/connectors/mcp-client.ts).

OAuth uses Google's installed-app flow: Friday starts a loopback HTTP listener
on `127.0.0.1`, opens the system browser, sends a PKCE code challenge and state,
then exchanges the authorization code for tokens at Google's token endpoint.
Refresh tokens are stored in the connector record and access tokens are
redacted from public reads.

`allowedTools` controls the generated local tools and the Gmail scopes requested
during consent. Leaving it empty enables all Gmail tools. Agent tool names are
generated as `<serverLabel>_<toolName>`, for example `gmail_search_emails`.

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

Friday always includes the profile and read scopes. It adds compose for
`create_draft`, send for `send_email`, and modify for `trash_email`.

## API Coverage

The Gmail API is the official REST API for authorized access to Gmail mailbox
data and sending mail. Friday calls Gmail REST resources under
`https://gmail.googleapis.com/gmail/v1/users/me`.

- Search and recent tools call `messages.list`.
- Read tools call `messages.get`; full body reads are projected to text and
  capped at 64 KiB.
- `create_draft` builds a raw MIME message and calls `drafts.create`.
- `send_email` builds a raw MIME message and calls `messages.send`.
- `trash_email` calls the Gmail trash endpoint for the message.

## Setup

1. Enable the Gmail API in the Google Cloud project.
2. Configure the OAuth consent screen.
3. Create an OAuth client with application type Desktop app.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
   launching Friday.
5. Add the connector in Settings, keep `allowedTools` as small as practical,
   save, then use Connect to finish Google consent.

## Input Notes

- `search_emails` and `search_email_ids` accept `query`, `maxResults`,
  `pageToken`, `labelIds`, and `includeSpamTrash`.
- `read_email` and `trash_email` accept `id` or `messageId`.
- `batch_read_email` accepts up to 10 ids.
- `create_draft` and `send_email` require `to`, `subject`, and `body`; `cc`,
  `bcc`, and `isHtml` are optional.

## Safety Notes

- Treat email body content as untrusted input.
- Keep `send_email` and `trash_email` disabled unless the workflow explicitly
  requires mailbox mutation.
- Use draft-and-review workflows for external messages whenever possible.

## Official Documentation

- [Gmail API guides](https://developers.google.com/workspace/gmail/api/guides)
- [Gmail API reference](https://developers.google.com/workspace/gmail/api/reference/rest)
- [Google OAuth 2.0 for iOS and Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google OAuth 2.0 scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

## Related Source

- [`src/main/agent/connectors/service.ts`](../../src/main/agent/connectors/service.ts)
- [`src/main/agent/connectors/mcp-client.ts`](../../src/main/agent/connectors/mcp-client.ts)
- [`docs/providers/google/gmail/index.md`](../providers/google/gmail/index.md)
