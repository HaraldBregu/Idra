# Google Drive read_file_content

Google Drive `read_file_content` reads supported text content from a Drive file.

## How It Is Used

- Used when Friday needs the contents of a selected Drive file.
- Supports summarizing, extracting action items, or answering questions about a
  document.
- Usually follows a file search or a user-provided file reference.

## Boundaries

- It should read only files relevant to the request.
- Drive file content is private account data and should be handled narrowly.
