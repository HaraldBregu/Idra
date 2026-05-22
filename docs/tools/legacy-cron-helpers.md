# Legacy Cron Helpers

`cron_add`, `cron_list`, and `cron_remove` are older scheduling helper names.

## How They Are Used

- They exist for compatibility with older scheduling flows.
- Current default agent scheduling should use `cron`.
- Documentation should point new work to the scheduled task tool instead of
  these helper names.

## Boundaries

- They are not part of the current default local tool registry exposed by the
  main agent service.
- New user-facing scheduling behavior should not be built around them.
