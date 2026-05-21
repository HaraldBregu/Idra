# Google Drive Connector

Catalog and runtime notes for Friday's Google Drive connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_googledrive` |
| Direct connector id | `google_drive` |
| Name | Google Drive |
| Runtime status | Local OAuth and local tool execution |
| Auth kind | Google OAuth |
| Redirect URI | `http://127.0.0.1:<temporary-port>` |
| Setup URL | [Google Cloud credentials](https://console.cloud.google.com/apis/credentials) |

## Environment Secrets

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

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

## Setup Checklist

1. Enable the Google Drive API in the target Google Cloud project.
2. Configure the OAuth consent screen.
3. Create a Desktop app OAuth client.
4. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` before
   launching Friday.
5. Add the connector in Settings, select the smallest useful `allowedTools`
   list, save it, then use Connect to finish Google consent.

## Runtime Notes

- Friday opens the system browser and receives the OAuth callback on a temporary
  local loopback port.
- `allowedTools` controls both the generated local tools and the Drive scopes
  requested during consent. Leaving it empty enables every Drive tool and all
  listed Drive scopes.
- With the default server label `google_drive`, local agent tools are exposed as
  `google_drive_search_files`, `google_drive_fetch`, `google_drive_create_file`,
  and similar names.
- `create_file` is the current connector tool that is marked
  approval-sensitive by the local approval hook.
- Local file-content reads return text content capped to 64 KiB.

## Input Notes

- `search_files` and `search` accept `query` or `q`, `driveQuery`, `mimeType`,
  `driveId`, `corpora`, `maxResults`, `pageToken`, and `orderBy`.
- `list_recent_files` and `recent_documents` accept `mimeType`, `driveId`,
  `corpora`, `maxResults`, and `pageToken`.
- `fetch`, `read_file_content`, `download_file_content`,
  `get_file_metadata`, and `get_file_permissions` accept `id` or `fileId`.
- `create_file` requires `name` or `fileName`; content, MIME type, parent ids,
  and description are optional.

## Example

Search files:

```json
{ "query": "name contains 'proposal'" }
```

Use with `search_files`.

## Platform Documentation

- [Google Drive API overview](https://developers.google.com/workspace/drive/api/guides/about-sdk)
- [Drive API reference](https://developers.google.com/drive/api/reference/rest/v3)

## Related Docs

- [Connector subsystem](index.md)
