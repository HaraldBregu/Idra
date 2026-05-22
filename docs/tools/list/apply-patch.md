# apply_patch

`apply_patch` applies a planned group of file changes.

## How It Is Used

- Used when several related edits should land together.
- Helpful for adding, updating, moving, or removing project files in a controlled
  way.
- Keeps the work easy to review because the change is expressed as a focused
  patch.

## Boundaries

- It can change files only inside the current workspace.
- Patch targets must not point outside the current workspace.
- It should only touch files that are part of the requested work.
- It should not be used for broad cleanup that the user did not ask for.
