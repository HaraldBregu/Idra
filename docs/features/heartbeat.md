# Heartbeat Health Checks

Heartbeat runs periodic or manual agent check-ins so Friday can surface reminders, alerts, or status updates without waiting for a user message.

## Functionality

- Runs scheduled agent turns for the main assistant or configured heartbeat agents.
- Supports manual wake requests and queued system events.
- Supports active hours, per-agent cadence, flood guards, and busy-session deferral.
- Reads `HEARTBEAT.md` startup context when available.
- Parses lightweight heartbeat tasks from heartbeat context and skips runs when no tasks are due.
- Can use isolated sessions, light context, model overrides, and run timeouts.
- Uses a heartbeat response tool to normalize quiet successes and actionable alerts.
- Routes delivery to no visible target, the last active target, the app, or a configured channel recipient.
- Stores lightweight run, delivery, duplicate alert, and task-last-run state.

## Behavior

A response of `HEARTBEAT_OK` is treated as a quiet success. Alert responses can be shown in the app, delivered through a configured channel, or reflected through an app indicator depending on visibility settings. Heartbeat skips when disabled, outside active hours, the agent is busy, the target session is unsafe, no agent service is available, or the heartbeat file/task gates say there is nothing to do.

## Source

- `src/main/heartbeat`
- `src/shared/heartbeat.ts`
- `src/main/service.ts`
- `src/renderer/src/pages/settings/pages/heartbeat`
- Existing docs: `docs/heartbeat/index.md`

