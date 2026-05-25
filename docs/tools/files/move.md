# move

`move` renames or relocates a file inside the current workspace.

## Tool Search Description

Use `move` to rename or relocate a current-workspace file while preserving its contents.

## Use For

- Putting a file in the right folder.
- Giving a file a clearer name.

## Do Not Use For

- Reorganizing unrelated project structure.
- Moving files without considering links or references.
- Moving files from or to paths outside the current workspace.

## When It Fails

If the move fails due to a path conflict or permission error, report the reason. The source file remains in its original location — do not assume it moved.

## Keep In Mind

After moving a file, update references when the user-facing result depends on them. Both the source and destination must be inside the current workspace.
