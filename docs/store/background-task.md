# Store — Background Task

The `backgroundTask` root stores admission and concurrency policy for user-created background tasks.

## Root

| Root | Owns |
| --- | --- |
| `backgroundTask` | Allowed task types and default task concurrency. |

## Initial Value

Missing `backgroundTask` is read as an empty policy.

```json
{}
```

## Shape

```json
{
  "allowedTaskTypes": ["agent.run"],
  "defaultConcurrency": 1
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `allowedTaskTypes` | string[] | Task types accepted for user-created tasks. |
| `defaultConcurrency` | number | Positive integer concurrency default. |

## Normalization

`allowedTaskTypes` keeps non-empty trimmed string entries. `defaultConcurrency` is kept only when it is a positive integer.

## Related Docs

- [Store](index.md)
- [Background Tasks](../tasks/background/index.md)
