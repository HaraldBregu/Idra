# Store — Connectors

The `connectors` property stores connector configuration records for external systems.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `connectors` | `ConnectorsSettings` | Connector ids, labels, auth settings, approval policy, tool metadata, and connector secrets. |

## Initial Value

Missing `connectors` is read as an empty connector list.

```json
{}
```

## Shape

The property is an object keyed by connector store key.

| Key | Connector |
| --- | --- |
| `google_gmail` | Gmail |
| `google_calendar` | Google Calendar |
| `google_drive` | Google Drive |
| `microsoft_teams` | Microsoft Teams |
| `outlook_calendar` | Outlook Calendar |
| `outlook_email` | Outlook Email |
| `sharepoint` | SharePoint |
| `dropbox` | Dropbox |

Each value is a connector config with fields such as `id`, `name`, `connectorId`, `serverLabel`, `enabled`, `authorization`, `oauth`, `requireApproval`, `allowedTools`, `deferLoading`, `tools`, timestamps, and `lastError`.

## Normalization

Reads accept both the current keyed object and older connector arrays. Writes always store the keyed object form. Connector secrets remain in this root.

## Related Docs

- [Store](index.md)
- [Connectors](../connectors/index.md)
