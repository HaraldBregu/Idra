# Google Drive Connector

Catalog metadata for Friday's Google Drive connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_googledrive` |
| Direct connector id | `google_drive` |
| Name | Google Drive |
| Runtime status | Local OAuth and API-client execution path |
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
