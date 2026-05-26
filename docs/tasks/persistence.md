# Task Persistence

The task module will use Electron Store to persist task runtime records in a `task.json` file. The Electron Store name should be `task`, so the persisted file is named `task.json` in the app's user data store.

This file stores serializable task state for the task manager UI, task history, and restart recovery. It must not store live process objects such as handlers, promises, abort controllers, event listeners, provider clients, or unsanitized secrets.

## File Shape

```json
{
  "schemaVersion": 1,
  "records": [],
  "updatedAt": "2026-05-26T00:00:00.000Z"
}
```

| Property | Type | Stored | Meaning |
| --- | --- | --- | --- |
| `schemaVersion` | number | Always | Persistence schema version used for future migrations. |
| `records` | `TaskRecord[]` | Always | Persisted task records. |
| `updatedAt` | string | Always | ISO timestamp for the last store write. |

## Task Record Properties

Each entry in `records` stores the public task record shape.

| Property | Type | Stored | Meaning |
| --- | --- | --- | --- |
| `id` | string | Always | Stable task id. |
| `type` | string | Always | Task handler type, such as `agent.run`. |
| `title` | string | Always | Human-readable task title. |
| `status` | `queued \| running \| cancelling \| cancelled \| succeeded \| failed` | Always | Current task lifecycle state. |
| `createdAt` | string | Always | ISO timestamp when the task record was created. |
| `startedAt` | string | When started | ISO timestamp when execution started. |
| `finishedAt` | string | When terminal | ISO timestamp when execution ended. |
| `progress` | object | When reported | Latest task progress snapshot. |
| `progress.current` | number | When reported | Current progress amount. |
| `progress.total` | number | When reported | Total progress amount. |
| `progress.message` | string | When reported | Short progress message. |
| `metadata` | `Record<string, unknown>` | Always | Sanitized caller metadata used for filtering, provenance, and scheduler context. |
| `result` | unknown | On success | Sanitized task result. |
| `error` | object | On failure | Public error metadata. |
| `error.code` | string | On failure | Stable error code or error name. |
| `error.message` | string | On failure | Redacted user-readable failure message. |

## Persistence Rules

- Write the store after task creation, start, progress update, success, failure, cancellation, and retention cleanup.
- Store only sanitized values using the task record sanitization rules before writing `metadata`, `result`, `progress.message`, or `error.message`.
- Treat `queued`, `running`, and `cancelling` records loaded at startup as persisted snapshots, not proof that work is still active.
- Keep schedule definitions separate from task records. Scheduled task definitions remain owned by cron storage.
- Use `accessPropertiesByDotNotation: false` so task metadata keys are stored literally.
