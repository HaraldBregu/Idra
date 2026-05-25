# Policy Schema

The policy module decides whether an operation on a path is permitted. It is configured by a JSON policy document that declares a default decision and a set of path grants.

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

Decision applied to any path not matched by `paths`.

| Value | Meaning |
| --- | --- |
| `deny` | Deny all unmatched paths. |
| `allow` | Allow all unmatched paths. |

### `paths`

List of path grants. Each entry declares what operations are permitted at a given path.

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | string | yes | Absolute path. Must not contain `..` or unresolved symlinks. |
| `permissions` | array | yes | Allowed operations. Empty array denies all operations at this path. |
| `recursive` | boolean | yes | `true` — grant applies to all descendants. `false` — grant applies to direct children only. |

### `permissions` values

| Value | Meaning |
| --- | --- |
| `read` | Content at this path may be read. |
| `write` | Existing content at this path may be overwritten. |
| `create` | New files or directories may be created at this path. |
| `delete` | Files or directories at this path may be removed. |

## Matching

1. Resolve the target path to its canonical absolute form.
2. Find all entries in `paths` whose `path` is a prefix of the target.
3. Select the entry with the longest matching prefix. Its `permissions` is the decision.
4. If no entry matches, apply `defaultPolicy`.
5. A `recursive: false` entry matches direct children only, not deeper descendants.

A more specific entry always wins. An empty `permissions` array on a child path overrides a permissive parent.

## Example

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

| Path | Effective permissions | Notes |
| --- | --- | --- |
| `/mnt/user-data/uploads/**` | `read` | |
| `/mnt/user-data/outputs/**` | `read`, `write`, `create` | |
| `/mnt/user-data/outputs/.secrets/**` | none | Overrides parent grant. |
| `/home/agent/workspace/**` | `read`, `write`, `create`, `delete` | |
| `/home/agent/workspace/node_modules/**` | `read` | Narrows workspace grant. |
| `/etc/*` (direct children only) | `read` | `recursive: false` — subdirectories not matched. |
| All other paths | deny | `defaultPolicy`. |

## Related Docs

- [File Tool Policy](index.md)
