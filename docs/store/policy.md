# Store — Policy

The `policy` property stores the active access control policy. The policy module reads this object via `StoreService` at evaluation time.

## Property

| Property | Type | Owns |
| --- | --- | --- |
| `policy` | `PolicySettings` | Access control policy version, default decision, and path grants. |

## Initial Value

At startup, the `policy` property should always start with this default value when no stored policy exists:

```json
{
  "version": 1,
  "defaultPolicy": "allow",
  "paths": [
    {
      "path": "/workspace",
      "permissions": ["read", "write", "create", "delete"],
      "recursive": true
    },
    {
      "path": "/agent",
      "permissions": ["read", "write", "create", "delete"],
      "recursive": true
    }
  ]
}
```

Both default path grants include all supported permissions.

## Properties

### `version`

Integer. Identifies the schema version. Must be `1`. The store rejects objects with an unrecognized version rather than normalizing them.

### `defaultPolicy`

String. Decision applied to any path not matched by `paths`.

| Value | Meaning |
| --- | --- |
| `deny` | Deny all unmatched paths. |
| `allow` | Allow all unmatched paths. |

### `paths`

Array of path grant objects. Each object has the following fields.

#### `paths[].path`

String. Absolute path. Must not contain `..` or unresolved symlinks.

#### `paths[].permissions`

Array of strings. Allowed operations at this path. An empty array denies all operations.

| Value | Meaning |
| --- | --- |
| `read` | Content at this path may be read. |
| `write` | Existing content at this path may be overwritten. |
| `create` | New files or directories may be created at this path. |
| `delete` | Files or directories at this path may be removed. |

#### `paths[].recursive`

Boolean. When `true`, the grant applies to all descendants. When `false`, it applies to direct children only.

## Normalization

Missing `policy` property is filled with `defaultPolicy: allow` and recursive default grants for `/workspace` and `/agent`. Unknown `permissions` values are dropped. Paths containing `..` are removed. The `paths` array order is preserved — the policy module depends on it for longest-prefix matching.

## Related Docs

- [Store](index.md)
- [Policy Module](../policy/index.md)
