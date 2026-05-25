# Store — Heartbeat

The `heartbeat` property stores lightweight heartbeat runtime state. Agent heartbeat configuration is stored under `assistant.options.agents`.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `heartbeat` | `HeartbeatSettings` | Last run timestamps and recently delivered heartbeat text. |

## Initial Value

Missing `heartbeat` is read from an empty heartbeat state.

```json
{
  "version": 1,
  "taskState": {},
  "lastDelivered": {}
}
```

## Shape

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | number | Heartbeat store schema version. |
| `taskState` | object | Last run timestamp records keyed by task. |
| `lastDelivered` | object | Delivered text records keyed by destination. |

## Normalization

Reads normalize missing heartbeat state before returning it. Writes store the normalized heartbeat state.

## Related Docs

- [Store](index.md)
- [Heartbeat](../heartbeat/index.md)
