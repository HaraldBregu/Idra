# apply_patch

`apply_patch` applies a planned group of file changes expressed as a unified
diff.

## How It Is Used

- Used when several related edits should land together.
- Helpful for updating or removing project files in a controlled way.
- Keeps the work easy to review because the change is expressed as a focused
  patch.
- All files in the patch must have been read earlier in the same run.

## Boundaries

- It can change files only inside the current workspace.
- Patch targets must not point outside the current workspace.
- It cannot create new files; a patch hunk targeting `/dev/null` is rejected.
- Context lines in the patch must match the current file exactly; mismatches
  cause the patch to fail rather than apply partially.
- It should only touch files that are part of the requested work.
- It should not be used for broad cleanup that the user did not ask for.
