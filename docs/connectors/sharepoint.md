# SharePoint Connector

Catalog metadata for Friday's SharePoint connector.

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
