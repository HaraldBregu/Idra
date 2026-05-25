# copy

`copy` duplicates content into another workspace path.

## Tool Search Description

Use `copy` to duplicate an existing file or directory into a new workspace location.

## Use For

- Creating a variant from an existing file.
- Reusing a template or asset.

## Do Not Use For

- Speculative duplicates.
- Replacing unrelated files.

## When It Fails

If the copy fails due to a path conflict or permission error, report the reason. Do not assume the destination file was created.

## Keep In Mind

Copying should preserve the source and create only the destination needed for the task. After copying, check whether the copy contains internal paths, imports, or links that reference the original location. Update them when the copy is intended to be independent.
