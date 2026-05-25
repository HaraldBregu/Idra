# process

`process` checks or stops background commands started by the agent.

## Use For

- Checking whether a background command is still running.
- Reading recent background output.
- Stopping a command that is no longer needed.

## Do Not Use For

- Managing unrelated user processes.
- Replacing normal command output for short commands.

## Keep In Mind

Use `process` to clean up long-running work before the task is considered complete.
