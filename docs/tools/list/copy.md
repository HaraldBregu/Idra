# copy

`copy` duplicates file content into a workspace location.

## How It Is Used

- Used when existing content should be reused as a starting point.
- Helpful for creating a variant while preserving the original.
- Can support documentation, templates, or project assets that need a duplicate.

## Boundaries

- It may read a permitted source file outside the current workspace.
- The copied or overwritten destination must stay inside the current workspace.
- It must not change or delete a source file outside the current workspace.
- Overwriting an existing destination requires `overwrite=true` and the
  destination must have been read earlier in the same run.
- It should not create speculative copies that the user did not ask for.
