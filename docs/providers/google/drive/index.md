# Google Drive Connector

Provider-scoped entry for Friday's Google Drive connector.

| Field | Value |
| --- | --- |
| Provider | [Google](../index.md) |
| Connector id | `connector_googledrive` |
| Direct connector id | `google_drive` |
| Runtime status | Local Google OAuth and local tool execution |
| Auth kind | Google OAuth |
| Canonical connector doc | [connectors/google-drive.md](../../../connectors/google-drive.md) |

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

## Related Docs

- [Google provider](../index.md)
- [Connector subsystem](../../../connectors/index.md)
