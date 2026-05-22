# inspect_file

`inspect_file` checks what kind of file Friday is dealing with and what can be
seen from it safely.

## How It Is Used

- Used when Friday needs basic facts about a file before deciding what to do.
- Helps identify whether the file is text, an image, or another kind of asset.
- Can provide a quick preview when that is useful for the request.

## Boundaries

- It is for inspection, not editing.
- It may inspect permitted files outside the current workspace when the runtime
  allows it.
- It should not replace reading a text file when the actual text matters.
