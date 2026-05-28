# inspect_file

`inspect_file` checks what kind of file Friday is dealing with and what can be
seen from it safely.

## How It Is Used

- Used when Friday needs basic facts about a file before deciding what to do.
- Returns file size, MIME type, SHA-256 hash (when the file fits within the byte
  limit), a hex preview of the first bytes, and a text preview for text files.
- Detects pixel dimensions for PNG, JPEG, GIF, and WebP images.
- For PNG, JPEG, GIF, and WebP files that fit within `maxBytes`, returns the
  image content inline as base64 so the model can see it directly.
- `maxBytes` defaults to 8 MB and caps at 16 MB; images larger than `maxBytes`
  are described but their content is not included.
- Calling this tool also records a read snapshot for the file, satisfying the
  read-before-write requirement for later edits.

## Boundaries

- It is for inspection, not editing.
- It may inspect permitted files outside the current workspace when the runtime
  allows it.
- It should not replace reading a text file when the actual text matters.
