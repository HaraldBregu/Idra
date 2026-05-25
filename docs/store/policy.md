# Store — Policy

The `policy` root stores the active access control policy. The policy module reads this object via `StoreService` at evaluation time.

## Root

| Root | Owns |
| --- | --- |
| `policy` | Access control policy version, default decision, and path grants. |

## Shape

```ts
{
  policy: {
    version: number;
    defaultPolicy: "allow" | "deny";
    paths: Array<{
      path: string;
      permissions: Array<"read" | "write" | "create" | "delete">;
      recursive: boolean;
    }>;
  }
}
```

## Properties

### `version`

Integer. Identifies the schema version. Must be `1`. The store rejects objects with an unrecognized version rather than normalizing them.

### `defaultPolicy`

Decision applied to any path not matched by `paths`.

| Value | Meaning |
| --- | --- |
| `deny` | Deny all unmatched paths. |
| `allow` | Allow all unmatched paths. |

### `paths`

Array of path grants evaluated by the policy module.

| Field | Type | Meaning |
| --- | --- | --- |
| `path` | string | Absolute path. No `..`, no unresolved symlinks. |
| `permissions` | array | Allowed operations at this path. Empty array denies all. |
| `recursive` | boolean | `true` — grant applies to all descendants. `false` — direct children only. |

`permissions` values: `read`, `write`, `create`, `delete`.

## Normalization

Missing `policy` root is filled with the default policy object below. Unknown `permissions` values are dropped. Paths containing `..` are removed. The `paths` array order is preserved — the policy module depends on it for longest-prefix matching.

### Default

```json
{
  "version": 1,
  "defaultPolicy": "deny",
  "paths": []
}
```

An empty `paths` array with `defaultPolicy: deny` blocks all path operations until a policy is explicitly configured.

## Related Docs

- [Store](index.md)
- [Policy Module](../policy/index.md)
