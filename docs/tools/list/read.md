# read

`read` lets Friday look at an existing workspace file before answering about it
or changing it.

## How It Is Used

- Used when the user's request depends on file contents.
- Helps Friday summarize, compare, review, or plan a change from real context.
- Gives later file changes a safer starting point because Friday has already
  inspected the file.

## Boundaries

- It does not change files.
- It should stay focused on files relevant to the request.
