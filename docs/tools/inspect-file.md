# inspect_file

`inspect_file` checks what a file is before the agent decides what to do with it. It is read-only and may inspect files outside the current workspace when needed for the request.

## Dependencies

Depends on the [policy module](../policy/index.md). Before inspecting, the policy module resolves the target path and checks whether `read` is permitted. If `read` is not granted, the tool stops and no metadata or preview is returned.

## Tool Selection Description

Use `inspect_file` to check file metadata, type, size, preview content, or image details before choosing the next action.

## Use For

- Checking file type, size, or metadata.
- Previewing a file safely.
- Understanding binary or image files.

## Do Not Use For

- Editing files.
- Reading full text when exact text matters.

## Choosing Between inspect_file and read

Use `inspect_file` when you need to decide whether and how to open a file: its type, size, encoding, or whether it is binary or image content.

Use `read` when you need the actual text content to answer a question, prepare an edit, or verify a result.

A common sequence before editing: `inspect_file` to confirm the file is what you expect, then `read` to get the exact content.

## When It Fails

If the file does not exist or cannot be inspected, report the path and reason. Do not infer file type or size.

## Keep In Mind

Inspection helps choose the right next step. It does not replace reading important text, and it must not change files.
