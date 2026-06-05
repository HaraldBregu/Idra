# delete

`delete` removes a workspace file or directory tree.

## How It Is Used

- Used when the user asks Friday to remove a file.
- Used when Friday's own change makes a newly created file unnecessary.
- Helps keep generated or replaced files from leaving clutter behind.
- Can remove a directory tree when `recursive=true` is set.

## Boundaries

- It can delete files and directories only inside the current workspace.
- It must not delete files outside the current workspace.
- Files must have been read earlier in the same run before they can be deleted.
- Directories require `recursive=true`; the tool refuses without it.
- It refuses to operate on the filesystem root, workspace root, or home
  directory regardless of arguments.
- It should be used cautiously because removal can lose work.
- It should not remove unrelated dead code or files unless the user requested
  that cleanup.
