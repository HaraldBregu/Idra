# Store — Heartbeat

Heartbeat uses a dedicated Electron store named `heartbeat`, persisted as `heartbeat.json` in the app user data directory. It is separate from the main `settings.json` store.

## File

| File | Owns |
| --- | --- |
| `heartbeat.json` | Heartbeat agent config, task timestamps, and recently delivered heartbeat text. |

## Initial Value

Missing or empty `heartbeat.json` is treated as no custom heartbeat config. Runtime state is read as empty:

```json
{
  "version": 1,
  "agents": {},
  "state": {
    "version": 1,
    "taskState": {},
    "lastDelivered": {}
  }
}
```

## Shape

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | number | Heartbeat store schema version. |
| `agents` | object | Optional custom heartbeat agent config. |
| `state` | object | Last task run timestamps and delivered text records. |

When `agents` is absent or empty, heartbeat uses code defaults such as `DEFAULT_HEARTBEAT_EVERY`.

## Related Docs

- [Store](index.md)
- [Heartbeat](../features/heartbeat.md)
