# Dropbox Connector

Catalog metadata for Friday's Dropbox connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_dropbox` |
| Direct connector id | `dropbox` |
| Name | Dropbox |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Dropbox App Console](https://www.dropbox.com/developers/apps) |

## Environment Secrets

- `DROPBOX_CLIENT_ID`
- `DROPBOX_CLIENT_SECRET`
- `DROPBOX_ACCESS_TOKEN`

## Tools

- `search`
- `fetch`
- `search_files`
- `fetch_file`
- `list_recent_files`
- `get_profile`

## Scopes

- `files.metadata.read`
- `files.content.read`
- `account_info.read`

## Example

Search files:

```json
{ "query": "quarterly report" }
```

Use with `search_files`.

## Platform Documentation

- [Dropbox HTTP API](https://www.dropbox.com/developers/documentation/http/overview)
- [Dropbox OAuth guide](https://developers.dropbox.com/oauth-guide)

## Related Docs

- [Connector subsystem](index.md)
