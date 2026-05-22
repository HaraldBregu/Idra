# write

`write` creates a new workspace file or replaces a whole file with new content.

## How It Is Used

- Used when the requested result is a complete saved document or file.
- Useful for new docs, generated configuration, or replacing a file that is meant
  to be rewritten as a whole.
- Friday should read an existing file first before replacing it.

## Boundaries

- It can create or overwrite files only inside the current workspace.
- It must not change files outside the current workspace.
- It is not the right choice for small targeted edits.
- It should not overwrite unrelated user work.
