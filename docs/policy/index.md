# Policy Module

The policy module decides whether an operation on a path is permitted. It is the single authority for access control. Nothing executes against a path until the policy module allows it.

## Dependencies

The policy module depends on `StoreService` to retrieve the policy data object. It does not own or load the policy document directly — it receives the parsed policy object from `StoreService` at evaluation time.

The shape and properties of the stored policy object are defined in [Store — Policy](../store/policy.md).

## Service Usage

The policy module can also be used as a service by runtime components that need to authorize path access before doing work.

Callers should:

1. Read the active policy with `StoreService.getPolicy()`.
2. Pass the policy, target path, and requested permission to `evaluate(...)`.
3. Continue only when the returned decision has `outcome: "allow"`.

Services that read, write, create, or delete paths should use this boundary instead of duplicating path matching or reading the stored policy object directly. Denied operations should surface the returned resolved path and reason so callers can explain why access was blocked.

## Matching

1. Resolve the target path to its canonical absolute form.
2. Find all entries in `paths` whose `path` is a prefix of the target.
3. Select the longest matching prefix. Its `permissions` is the decision.
4. If no entry matches, apply `defaultPolicy`.
5. Entries with `recursive: false` match direct children only.

A more specific entry always wins. An empty `permissions` array on a child path overrides a permissive parent.

## Decisions

| Outcome | Meaning                               |
| ------- | ------------------------------------- |
| `allow` | The requested operation is permitted. |
| `deny`  | The requested operation is rejected.  |

The result includes the resolved path, the matched grant, and a reason.

## Related Docs

- [Store — Policy](../store/policy.md)
