# SharePoint Connector

Catalog notes for Friday's SharePoint connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_sharepoint` |
| Direct connector id | `sharepoint_onedrive` |
| Name | SharePoint |
| Runtime status | Settings catalog only |
| Auth kind | Manual OAuth access token |
| Setup URL | [Microsoft Entra app registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) |

## Environment Secrets

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_SHAREPOINT_ACCESS_TOKEN`

## Tools

- `get_site`
- `search`
- `list_recent_documents`
- `fetch`
- `get_profile`

## Scopes

- `Sites.Read.All`
- `Files.Read.All`
- `User.Read`

## Current Runtime

SharePoint is present in the Settings catalog with setup metadata, scopes, and
tool names. It does not have a local `ConnectorToolStrategy` yet, so default
agent tool execution is not implemented for this connector.

The Settings access-token field can store a manual Microsoft Graph OAuth access
token for local development. For production work, add a real OAuth or
secret-backed credential flow before relying on this connector.

## Setup Checklist

1. Create or open an app registration in Microsoft Entra.
2. Grant the listed Microsoft Graph files and sites permissions.
3. Complete OAuth for the account.
4. Paste the access token into the Settings OAuth access-token field only for
   local development.
5. Keep `allowedTools` limited to read/search tools until local execution and
   approval behavior are implemented.

## Implementation Work Remaining

- Add Microsoft OAuth and token refresh handling.
- Add a local tool strategy in `ConnectorsService`.
- Add typed schemas, output projection, redaction tests, and at least one
  representative read test.

## Example

Fetch a document:

```json
{ "id": "drive-item-id" }
```

Use with `fetch`.

## Platform Documentation

- [OneDrive files in Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0)
- [SharePoint sites API](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0)

## Related Docs

- [Connector subsystem](index.md)
