# Google Drive Connector

Friday's Google Drive connector searches, reads, downloads, inspects, and
creates Drive files through dynamic MCP tool discovery.

Official provider documentation was checked on 2026-05-24.

## Catalog

| Field               | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Connector id        | `connector_googledrive`                                                       |
| Direct connector id | `google_drive`                                                                |
| Runtime status      | Dynamic MCP tools                                          |
| Auth kind           | Google OAuth                                                                  |
| Redirect URI        | `http://127.0.0.1:<temporary-port>`                                           |
| Setup URL           | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

## Implementation

The catalog entry is defined in
[`OPENAI_CONNECTOR_CATALOG`](../../src/shared/connector/connectors.ts). Local
execution is implemented by `ConnectorsService` with a Drive runtime strategy
and API helpers in
[`src/main/agent/connectors/mcp-client.ts`](../../src/main/agent/connectors/mcp-client.ts).

OAuth uses the same Google installed-app flow as Gmail and Calendar: loopback
redirect, browser consent, PKCE, state validation, token exchange, refresh, and
secret redaction. `allowedTools` controls generated tools and requested scopes.
Friday requests the Drive read scope when any Drive tool other than
`get_profile` is enabled, and adds `drive.file` when `create_file` is enabled.

Agent tool names are generated as `<serverLabel>_<toolName>`, for example
`google_drive_search_files`.

## Tools

- `get_profile`
- `search_files`
- `list_recent_files`
- `read_file_content`
- `get_file_metadata`
- `get_file_permissions`
- `download_file_content`
- `create_file`
- `list_drives`
- `search`
- `recent_documents`
- `fetch`

## Scopes

- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/drive.file`

The official Google scope list describes `drive.readonly` as read/download access
to Drive files and `drive.file` as access to files used with the app.

## API Coverage

The Google Drive API is the official REST API for Drive storage. Friday calls
resources under `https://www.googleapis.com/drive/v3`.

- `list_drives` calls `drives.list`.
- `search_files`, `search`, `list_recent_files`, and `recent_documents` call
  `files.list`.
- Metadata and permission tools call `files.get` and `permissions.list`.
- Content reads call `files.export` for Google Workspace files or `files.get`
  with media download for binary/text files. Returned text content is capped at
  64 KiB.
- `create_file` calls `files.create` or multipart upload at
  `/upload/drive/v3/files`.

## Setup

1. Enable the Google Drive API in the Google Cloud project.
2. Configure the OAuth consent screen with Drive readonly and Drive file scopes.
3. Create an OAuth client with application type Desktop app.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
   launching Friday.
5. Add the connector in Settings, keep `allowedTools` as small as practical,
   save, then use Connect to finish Google consent.

## Input Notes

- `search_files` and `search` accept `query` or `q`, `driveQuery`, `mimeType`,
  `driveId`, `corpora`, `maxResults`, `pageToken`, and `orderBy`.
- `list_recent_files` and `recent_documents` accept `mimeType`, `driveId`,
  `corpora`, `maxResults`, and `pageToken`.
- `fetch`, `read_file_content`, `download_file_content`,
  `get_file_metadata`, and `get_file_permissions` accept `id` or `fileId`.
- `create_file` requires `name` or `fileName`; content, MIME type, parent ids,
  and description are optional.

## Safety Notes

- `create_file` is approval-sensitive in the local runtime unless connector
  approval settings explicitly disable that requirement.
- Treat downloaded file content as untrusted input.
- Use permission-aware retrieval and do not bypass Drive ACLs.

## Official Documentation

- [Google Drive API overview](https://developers.google.com/workspace/drive/api/guides/about-sdk)
- [Google Drive API reference](https://developers.google.com/workspace/drive/api/reference/rest/v3)
- [Google OAuth 2.0 for iOS and Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google OAuth 2.0 scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

## Related Source

- [`src/main/agent/connectors/service.ts`](../../src/main/agent/connectors/service.ts)
- [`src/main/agent/connectors/mcp-client.ts`](../../src/main/agent/connectors/mcp-client.ts)
- [`docs/providers/google/drive/index.md`](../providers/google/drive/index.md)
