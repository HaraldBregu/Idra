# Policy Schema

The policy schema defines which filesystem paths an agentic tool may access, and what operations are permitted on each. It is evaluated before any file tool executes.

## Format

```json
{
  "policies": {
    "version": 1,
    "defaultPolicy": "deny",
    "paths": [
      {
        "path": "/absolute/path",
        "permissions": ["read", "write", "create", "delete"],
        "recursive": true
      }
    ]
  }
}
```

## Fields

### `version`

Integer. Schema version. Must be `1`.

### `defaultPolicy`

String. Applied to any path not matched by the `paths` list.

| Value | Meaning |
| --- | --- |
| `deny` | Reject all unmatched paths. |
| `allow` | Permit all unmatched paths. |

Use `deny` for agentic contexts. An allow default would grant access to every path the agent does not explicitly restrict.

### `paths`

Ordered list of path grants. The policy engine matches the most specific (longest) path prefix first.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | string | yes | Absolute path. Must not contain `..` or unresolved symlinks. |
| `permissions` | array | yes | Set of allowed operations. Empty array means deny all. |
| `recursive` | boolean | yes | When `true`, the grant applies to all descendants. When `false`, applies only to direct children of the directory. |

### `permissions` values

| Value | Meaning |
| --- | --- |
| `read` | May list, inspect, or read file content. |
| `write` | May overwrite an existing file. |
| `create` | May create new files or directories. |
| `delete` | May remove files or directories. |

Permissions are not additive across entries. A more specific path with an empty `permissions` array overrides a parent with full permissions.

## Matching Rules

1. Resolve the target path to its canonical absolute form before matching.
2. Walk the `paths` list and collect every entry whose `path` is a prefix of the target.
3. Select the longest matching prefix. That entry's `permissions` governs the operation.
4. If no entry matches, apply `defaultPolicy`.
5. A `recursive: false` entry only matches direct children, not deeper descendants.

## Example — Agentic AI Tool Policy

```json
{
  "policies": {
    "version": 1,
    "defaultPolicy": "deny",
    "paths": [
      {
        "path": "/mnt/user-data/uploads",
        "permissions": ["read"],
        "recursive": true
      },
      {
        "path": "/mnt/user-data/outputs",
        "permissions": ["read", "write", "create"],
        "recursive": true
      },
      {
        "path": "/mnt/user-data/outputs/.secrets",
        "permissions": [],
        "recursive": true
      },
      {
        "path": "/home/agent/workspace",
        "permissions": ["read", "write", "create", "delete"],
        "recursive": true
      },
      {
        "path": "/home/agent/workspace/node_modules",
        "permissions": ["read"],
        "recursive": true
      },
      {
        "path": "/etc",
        "permissions": ["read"],
        "recursive": false
      }
    ]
  }
}
```

### What this policy does

| Path | Effective permissions | Reason |
| --- | --- | --- |
| `/mnt/user-data/uploads/**` | `read` | Input data is read-only. The agent may not alter uploaded files. |
| `/mnt/user-data/outputs/**` | `read`, `write`, `create` | The agent may write results but not delete them. |
| `/mnt/user-data/outputs/.secrets/**` | none | Secrets inside the outputs tree are fully blocked despite the parent grant. |
| `/home/agent/workspace/**` | `read`, `write`, `create`, `delete` | The agent has full control of its own workspace. |
| `/home/agent/workspace/node_modules/**` | `read` | Dependencies must not be mutated at runtime. |
| `/etc` (direct children only) | `read` | The agent may read top-level config files but cannot descend into `/etc` subdirectories. |
| Everything else | deny | `defaultPolicy: deny` blocks all unmatched paths. |

### Override semantics

`/mnt/user-data/outputs/.secrets` has an empty `permissions` array. It is a more specific prefix than `/mnt/user-data/outputs`, so it wins. Any read or write attempt against that subtree is denied even though the parent permits both.

`/home/agent/workspace/node_modules` narrows the full-access workspace grant to read-only for the dependency directory. The agent cannot install, patch, or remove packages during a run.

## Related Docs

- [File Tool Policy](index.md)
- [Tools](../tools/index.md)
