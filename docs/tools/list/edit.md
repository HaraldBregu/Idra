# edit

`edit` changes a specific part of an existing workspace file.

## How It Is Used

- Used when only a small section of a file needs to change.
- Keeps the surrounding file intact.
- Best for precise documentation, text, or configuration updates after Friday has
  read the file.

## Boundaries

- It can change files only inside the current workspace.
- It must not edit files outside the current workspace.
- It should not be used to redesign or reformat unrelated content.
- If the change is broad, a planned patch may be clearer.
