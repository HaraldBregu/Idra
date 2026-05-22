# process

`process` manages background commands that Friday started.

## How It Is Used

- Used to check whether a long-running command is still active.
- Used to read recent output from a background command.
- Used to stop a background command when it is no longer needed.

## Boundaries

- It is for processes Friday started through tool use.
- It should not interfere with unrelated user processes.
