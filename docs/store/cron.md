# Store — Cron

The `cron` property stores persisted scheduler configuration and schedule records.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `cron` | `CronSettings` | Friday cron jobs, scheduler state, and cron task records. |

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
| `scheduler` | object | Scheduler state for persisted managed schedules. |
| `tasks` | array | Cron task records used by the cron service. |

## Normalization

Reads return an empty scheduler state when `cron` is missing. Writes merge scheduler and task patches into the existing property. Friday cron writes serialize the current state at the property.

## Related Docs

- [Store](index.md)
- [Scheduled Tasks](../tasks/scheduled/index.md)
