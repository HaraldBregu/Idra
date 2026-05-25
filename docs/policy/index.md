# Policy Module

The policy module decides whether an operation on a path is permitted. It is the single authority for access control. Nothing executes against a path until the policy module allows it.

## Configuration

Policies are defined in a JSON document.

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

### `defaultPolicy`

The decision applied to any path not matched by `paths`. Use `deny` in agentic contexts.

### `paths`

Each entry grants a set of permissions at a path.

| Field | Type | Meaning |
| --- | --- | --- |
| `path` | string | Absolute path. No `..`, no unresolved symlinks. |
| `permissions` | array | Allowed operations. Empty array denies all. |
| `recursive` | boolean | `true` — applies to all descendants. `false` — direct children only. |

### `permissions`

| Value | Meaning |
| --- | --- |
| `read` | Content at this path may be read. |
| `write` | Existing content at this path may be overwritten. |
| `create` | New files or directories may be created at this path. |
| `delete` | Files or directories at this path may be removed. |

## Matching

1. Resolve the target path to its canonical absolute form.
2. Find all entries whose `path` is a prefix of the target.
3. Select the longest matching prefix. Its `permissions` is the decision.
4. If no entry matches, apply `defaultPolicy`.
5. `recursive: false` entries match direct children only.

A more specific entry always wins. An empty `permissions` array on a child path overrides a permissive parent.

## Decisions

| Outcome | Meaning |
| --- | --- |
| `allow` | The requested operation is permitted. |
| `deny` | The requested operation is rejected. |

The result includes the resolved path, the matched grant, and a reason.

## Related Docs

- [Tools](../tools/index.md)
