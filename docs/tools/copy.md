# copy

`copy` duplicates content into another path inside the current workspace.

## Dependencies

Depends on the [policy module](../policy/index.md). Before copying, the policy module resolves both paths and checks two grants: `read` on the source and `create` on the destination. If either check is denied, the tool stops and no file is created.

## Tool Search Description

Use `copy` to duplicate an existing file or directory into a new current-workspace location.

## Use For

- Creating a variant from an existing file.
- Reusing a template or asset.

## Do Not Use For

- Speculative duplicates.
- Replacing unrelated files.
- Creating destination files or directories outside the current workspace.

## When It Fails

If the copy fails due to a path conflict or permission error, report the reason. Do not assume the destination file was created.

## Keep In Mind

Copying should preserve the source and create only the destination needed for the task. The source may be outside the current workspace when it is readable and relevant, but the destination must stay inside the current workspace. After copying, check whether the copy contains internal paths, imports, or links that reference the original location. Update them when the copy is intended to be independent.
