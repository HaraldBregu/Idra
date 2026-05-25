# edit

`edit` changes a specific part of an existing file.

## Tool Search Description

Use `edit` to make a precise change to one known section of an existing workspace file.

## Use For

- Small documentation, text, code, or configuration changes.
- Replacing a known section after reading the file.

## Do Not Use For

- Broad rewrites.
- Unrelated formatting cleanup.

## When It Fails

If the target section cannot be found in the file, do not guess at a match or apply the edit to the wrong location. Re-read the file to get the current content, then try again with an exact match.

## Keep In Mind

Make the edit precise enough that the surrounding file stays intact.
