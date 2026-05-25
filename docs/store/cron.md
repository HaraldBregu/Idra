# Store — Cron

The `cron` property stores persisted scheduler configuration and schedule records.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `cron` | `CronSettings` | Friday cron jobs, migrated scheduler state, and legacy cron task records. |

## Initial Value

Missing `cron` is read as an empty scheduler state.

```json
{}
```

## Shape

The current Friday cron state stores property-level schedule data:

| Field | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | number | Friday cron store schema version. |
| `jobs` | object | Persisted job definitions keyed by job id. |

Legacy fields may still be read during migration:

| Field | Type | Meaning |
| --- | --- | --- |
| `managed` | object | Older managed scheduler state. |
| `legacyTasks` | array | Older cron task records. |
| `friday` | object | Older nested Friday cron state. |

## Normalization

Reads migrate missing or legacy scheduler state to the current scheduler shape. Writes merge scheduler patches into the existing property. Friday cron writes serialize the current state at the property and remove legacy nested Friday cron fields.

## Related Docs

- [Store](index.md)
- [Scheduled Tasks](../tasks/scheduled/index.md)
