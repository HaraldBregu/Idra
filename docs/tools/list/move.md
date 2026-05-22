# move

`move` renames or relocates a workspace file.

## How It Is Used

- Used when a file belongs in a different folder.
- Used when a name should better match the file's purpose.
- Preserves the file contents while changing where the project finds it.

## Boundaries

- It can move or rename files only inside the current workspace.
- It must not move, remove, or rename files outside the current workspace.
- It should not reorganize unrelated project structure.
- It should account for links or references that may need to follow the move.
