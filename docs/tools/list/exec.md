# exec

`exec` runs an approved command or script.

## How It Is Used

- Used for project checks such as tests, builds, formatting checks, and status
  commands.
- Helps verify whether a change actually works.
- Can run project utilities when the requested task depends on them.
- Supports a `background=true` flag to start a long-running process and return a
  process id immediately; use the `process` tool to inspect or stop it.
- Must not be used to schedule future or recurring work. Use Friday's `cron`
  tool for scheduled tasks.
- Output is capped at 200 lines / 16 KB.

## Boundaries

- It can execute approved scripts or commands inside or outside the current
  workspace when permissions allow it.
- Execution location is not the same as file mutation permission; file-changing
  work should still stay inside the workspace unless a broader permission is
  explicitly granted.
- The following command patterns are hard-blocked regardless of arguments:
  `rm -rf /`, force-push to `main`/`master`, fork bomb (`:(){:|:&};:`), `mkfs`,
  `dd if=...of=/dev/...`, `shutdown`, `reboot`, and host scheduler commands
  such as `crontab`, `launchctl`, `systemctl ... timer`, and `schtasks`.
- It should not run destructive commands unless the user clearly asked for them.
- It should not replace purpose-built tools when a safer tool exists.
