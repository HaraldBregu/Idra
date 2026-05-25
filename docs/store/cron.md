# Store — Cron

The `taskScheduler` root stores persisted scheduler configuration and schedule records.

## Root

| Root | Owns |
| --- | --- |
| `taskScheduler` | Friday cron jobs, migrated scheduler state, and legacy cron task records. |

## Initial Value

Missing `taskScheduler` is read as an empty scheduler state.

```json
{}
```

## Shape

The current Friday cron state stores root-level schedule data:

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

Reads migrate missing or legacy scheduler state to the current scheduler shape. Writes merge scheduler patches into the existing root. Friday cron writes serialize the current state at the root and remove legacy nested Friday cron fields.

## Related Docs

- [Store](index.md)
- [Scheduled Tasks](../tasks/scheduled/index.md)
