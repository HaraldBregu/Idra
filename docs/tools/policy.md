# Tool Policy

Tool policy controls which tools are available to an agent run after the runtime has assembled the candidate tool list.

Use policy to narrow access by profile, explicit allow lists, deny lists, sender ownership, sandbox state, and runtime constraints. Policy does not create tools by itself; it only filters tools that were already registered for the run.

## Profiles

Profiles provide broad defaults before more specific allow or deny rules apply.

| Profile | Default access |
| --- | --- |
| `minimal` | No tools. |
| `coding` | File tools plus `exec` and `process`. |
| `messaging` | Messaging and session tools. |
| `full` | Every candidate tool. |

## Policy Entries

Policy entries can target exact tool names, groups, plugin ids, or glob patterns.

| Entry type | Example | Effect |
| --- | --- | --- |
| Exact tool | `read` | Matches one tool by name. |
| Group | `group:file` | Expands to the known tools in that group. |
| Plugin | `plugin:github` | Expands to tools owned by that plugin. |
| Glob | `gmail_*` | Matches all current tool names with that pattern. |
| All | `*` | Matches every candidate tool. |

Unknown entries are ignored and recorded as diagnostics warnings.

## Allow And Deny

`allow`, `alsoAllow`, and `profile` form the grant set. If any grant set is present, only matching tools remain. `deny` then removes matching tools from the current set.

Use `allow` when a run should be tightly scoped. Use `alsoAllow` to add tools to a profile without replacing the profile. Use `deny` for hard exclusions, such as disabling shell tools for a constrained agent.

## Stage Order

The policy pipeline applies stages in this order:

1. `profile`
2. `providerProfile`
3. `global`
4. `providerGlobal`
5. `agent`
6. `providerAgent`
7. `channelGroup`
8. `sender`
9. `sandbox`
10. `subagent`
11. `inheritedParent`
12. `runtime`

Later stages see the tools left by earlier stages. A tool removed by one stage is not restored by a later stage unless it was still present in the current candidate set and explicitly granted before removal.

## Owner-Only Tools

Owner-only tools are hidden from non-owner senders before staged policies run. A trusted owner grant can keep a specific owner-only tool available.

## Sandbox Policy

Sandbox policy can remove tools that are unsafe in the current execution context. For example, read-only filesystem mode denies mutating file tools such as `write`, `edit`, `apply_patch`, `delete`, `copy`, and `move`.

## Related Docs

- [Tools](index.md)
- [Bootstrap tools](bootstrap/index.md)
- [File tools](files/index.md)
