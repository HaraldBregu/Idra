# Dropbox Connector

Catalog notes for Friday's Dropbox connector.

| Field               | Value                                                          |
| ------------------- | -------------------------------------------------------------- |
| Connector id        | `dropbox.files`                                            |
| Direct connector id | `dropbox`                                                      |
| Name                | Dropbox                                                        |
| Runtime status      | Settings catalog only                                          |
| Auth kind           | MCP env variables                                      |
| Setup URL           | [Dropbox App Console](https://www.dropbox.com/developers/apps) |

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

## Current Runtime

Dropbox is present in the Settings catalog with setup metadata, scopes, and tool
names. It does not have a local `ConnectorToolStrategy` yet, so default agent
tool execution is not implemented for this connector.

The MCP config env reference can store a manual OAuth access token for local
development. For production work, add a real OAuth or secret-backed credential
flow before relying on this connector.

## Setup Checklist

1. Create or open a Dropbox app in the Dropbox App Console.
2. Grant the listed file metadata, file content, and account scopes.
3. Complete OAuth for the account.
4. Paste the access token into the MCP config env reference only for
   local development.
5. Keep `allowedTools` limited to the smallest read/search surface until local
   execution and approval behavior are implemented.

## Implementation Work Remaining

- Add token refresh or expiration handling if the selected Dropbox app flow
  requires it.
- Add a local tool strategy in `ConnectorsService`.
- Add typed schemas, output projection, redaction tests, and at least one
  representative read test.

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

- [Dropbox provider](../index.md)
