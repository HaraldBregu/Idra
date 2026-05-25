# write

`write` creates a new file or replaces a whole file.

## Tool Search Description

Use `write` to create a new workspace file or replace an entire file with complete new content.

## Use For

- New documents or generated files.
- Complete file replacement when that is the requested change.

## Do Not Use For

- Small targeted edits.
- Overwriting existing work without first reading it.

## When It Fails

If the write fails due to a permission error or invalid path, report the reason. Do not assume the file was created or modified.

## Keep In Mind

Use the smallest safe file change. If only part of a file changes, prefer `edit` or `apply_patch`.
