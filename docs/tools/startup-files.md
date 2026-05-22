# startup_files

`startup_files` gives a bootstrap run controlled access to startup context.

## How It Is Used

- Used only during the primary startup bootstrap flow.
- Lets Friday gather the startup files it is allowed to consider.
- Keeps bootstrap focused by making it the only local tool in that run.

## Boundaries

- It is not a normal chat or coding tool.
- It appears only when the runtime has a pending bootstrap task.
