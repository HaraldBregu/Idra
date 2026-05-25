# write

`write` creates a new file or replaces a whole file inside the current workspace.

## Dependencies

Depends on the [policy module](../policy/index.md). Before writing, the policy module resolves the destination path and checks whether `write` or `create` is permitted. Creating a new file requires `create`. Replacing an existing file requires `write`. If the required permission is not granted, the tool stops and no file is written.

## Tool Search Description

Use `write` to create a new current-workspace file or replace an entire workspace file with complete new content.

## Use For

- New documents or generated files.
- Complete file replacement when that is the requested change.

## Do Not Use For

- Small targeted edits.
- Overwriting existing work without first reading it.
- Creating or replacing files outside the current workspace.

## When It Fails

If the write fails due to a permission error or invalid path, report the reason. Do not assume the file was created or modified.

## Keep In Mind

Use the smallest safe file change. If only part of a file changes, prefer `edit` or `apply_patch`. Never use `write` to create or replace a file outside the current workspace.
