# read

`read` lets Friday look at an existing file before answering about it or
changing related workspace files.

## How It Is Used

- Used when the user's request depends on file contents.
- Helps Friday summarize, compare, review, or plan a change from real context.
- Gives later file changes a safer starting point because Friday has already
  inspected the file.

## Boundaries

- It does not change files.
- It may read permitted files outside the current workspace when the runtime
  allows it.
- It should stay focused on files relevant to the request.
