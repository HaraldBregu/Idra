# delete

`delete` removes a workspace file.

## How It Is Used

- Used when the user asks Friday to remove a file.
- Used when Friday's own change makes a newly created file unnecessary.
- Helps keep generated or replaced files from leaving clutter behind.

## Boundaries

- It can delete files only inside the current workspace.
- It must not delete files outside the current workspace.
- It should be used cautiously because removal can lose work.
- It should not remove unrelated dead code or files unless the user requested
  that cleanup.
