# File Tool Policy

The file tool policy module decides whether a file tool call is allowed to execute for a specific directory-scoped operation.

File tools can keep their full implementation capability. They should not each own separate permission logic. Before a file tool reads, creates, updates, moves, copies, or deletes a path, it asks the policy module for a decision. The policy module returns the permission needed for that exact action and target.

## Goal

Keep file access rules in one system module.

- File tools describe what they want to do.
- The policy module decides whether that action is allowed.
- The tool executes only when the policy allows it.
- Denied calls stop before filesystem mutation or data exposure.

## Scope

This policy applies to file tools only:

| Tool | Policy action |
| --- | --- |
| `read` | Read file content from an allowed path. |
| `write` | Create or replace a file in an allowed writable directory. |
| `edit` | Update an existing file in an allowed writable directory. |
| `apply_patch` | Update one or more files in allowed writable directories. |
| `delete` | Delete an allowed file or directory target. |
| `copy` | Read the source and write the destination when both sides are allowed. |
| `move` | Read/write/delete the source and destination according to the move plan. |
| `inspect_file` | Read file metadata or preview data from an allowed path. |
| `find` | Search only inside allowed directories. |

## Directory Grants

A grant describes what a tool may do inside a directory.

| Grant | Meaning |
| --- | --- |
| `read` | The tool may list, inspect, find, or read files. |
| `write` | The tool may create or replace files. |
| `modify` | The tool may edit existing files or apply patches. |
| `delete` | The tool may remove files or directories. |

Write-like permissions do not imply read unless the grant explicitly includes read. A tool that needs both must request both.

## Decision Input

Every policy check should include:

- tool name
- requested action
- absolute resolved target path
- workspace root
- whether the target is a file, directory, missing path, symlink, or unsupported type when known
- source and destination paths for copy or move
- current run context, including agent id and sandbox mode

The policy module resolves relative paths before deciding. Tools should not rely on caller-provided path strings for permission checks.

## Decision Output

The policy module returns one of these outcomes:

| Outcome | Meaning |
| --- | --- |
| `allow` | The tool may execute the requested operation. |
| `deny` | The tool must stop and return a tool error. |
| `approval_required` | The tool must stop unless the run has explicit approval for this action. |

The result should include the normalized path, matched grant, and a short reason. Tools should report the reason without leaking unrelated filesystem details.

## Enforcement Rules

- Resolve paths before checking policy.
- Reject targets outside allowed directories unless a grant explicitly covers them.
- Reject symlinks and hard-linked files for write-like operations.
- Apply the same policy to every file touched by a patch.
- Check both source and destination for copy and move.
- Deny directory deletion unless the delete grant explicitly covers the directory target.
- Re-check policy immediately before mutation when the tool read or inspected the target earlier in the run.

## Related Docs

- [Tools](../tools/index.md)
- [File tools](../tools/files/index.md)
