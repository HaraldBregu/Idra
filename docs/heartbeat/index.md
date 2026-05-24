# Heartbeat

Heartbeat runs periodic agent check-ins so Friday can surface reminders, alerts, or lightweight status updates without waiting for a user message.

## What It Does

- Schedules periodic agent turns for the default assistant or configured heartbeat agents.
- Accepts manual, cron, hook, background-task, exec-completion, notification, restart, and watchdog wake requests.
- Reads `HEARTBEAT.md` for periodic guidance and optional lightweight `tasks:` entries.
- Suppresses quiet results while still recording status and delivering actionable alerts.
- Routes output to no visible target, the last active chat route, or an explicit channel/account/recipient.
- Stores task last-run timestamps, duplicate-alert state, and latest heartbeat status.

## Scheduling

Heartbeat scheduling is owned by `src/main/heartbeat/service.ts`, with timing helpers in `src/main/heartbeat/schedule.ts`.

- Default cadence is `30m`; `0`, `0m`, or an invalid/non-positive duration disables the interval for that agent.
- If any `agents.list[]` entry has a `heartbeat` block, only those agents get schedules. Otherwise Friday schedules all listed agents when defaults exist, or the default agent when no list is configured.
- Each scheduled agent gets a stable phase within its interval. The phase is a hash of scheduler seed plus agent id, so multiple agents do not all fire at the same instant.
- Active hours are checked with `start`, `end`, and `timezone`. `24:00` is allowed as an end time. Equal start and end times mean no active window. Invalid times or invalid timezones fall back to allowing the run.
- The service arms one timer for the earliest due schedule. When it fires, it requests scheduled wakes for all due agents.

## Wake Layer

Wake coalescing is implemented in `src/main/heartbeat/wake.ts`.

- `requestHeartbeat()` queues wakes by `agentId` and `sessionKey`.
- Wakes coalesce for 250 ms by default.
- Manual and immediate wakes have the highest priority, scheduled interval wakes have lower priority, and retry wakes have the lowest priority.
- Busy skips with `requests-in-flight`, `cron-in-progress`, or `lanes-busy` are retryable and requeued after 1 second.
- Only one wake batch runs at a time. If a wake arrives while a batch is running, it is scheduled after the active batch finishes.

Cooldown policy lives in `src/main/heartbeat/cooldown.ts`.

- Manual wakes are never deferred.
- Immediate wakes bypass ordinary cooldown but still use the flood guard.
- Scheduled wakes defer until their `nextDueMs`.
- Event wakes run immediately if the agent has not run before, then respect `nextDueMs` and a 30-second minimum spacing floor.
- The flood guard defers after 5 runs inside 60 seconds for the same agent.

## Run Flow

`HeartbeatService.runHeartbeatOnce()` performs the actual heartbeat run.

1. Resolve the agent heartbeat summary from store-backed `agents.defaults.heartbeat` and per-agent overrides.
2. Merge any wake-level delivery override (`target`, `to`, `accountId`).
3. Resolve the base session key from the wake, `heartbeat.session`, or the agent id. `main` maps to the agent id and `global` maps to the default agent id.
4. If `isolatedSession` is enabled, run the agent in a fresh `<base>:heartbeat:<timestamp>` session while using the base session for task state and delivery routing.
5. Skip when runtime heartbeat is disabled, the agent is disabled, the interval is disabled, the session key is unsafe, or the run is outside active hours.
6. Apply cooldown and busy checks. The service checks both the agent id and the resolved heartbeat session with `agentService.isBusy()`.
7. Resolve delivery before calling the model. `target: "none"` runs silently; `target: "last"` uses the last recorded channel route for the session; explicit targets use the channel registry.
8. Read `HEARTBEAT.md`, inspect queued system events, parse due tasks, assemble a prompt, then invoke the agent service.

## HEARTBEAT.md

Friday reads `HEARTBEAT.md` through the startup-files service for the target agent.

- A missing file does not block a heartbeat.
- An existing file that contains only blank lines, headings, fences, comments, empty list items, or the default template text is treated as empty and skips as `empty-heartbeat-file`.
- Event-style wakes from exec, cron, hooks, background tasks, ACP spawn, and restart sentinels bypass file gates.
- A `tasks:` block can define due-only periodic checks:

```yaml
tasks:
  - name: inbox-triage
    interval: 30m
    prompt: "Check for urgent unread messages."
  - name: calendar-scan
    interval: 2h
    prompt: "Check for upcoming meetings that need prep."
```

Only due tasks are included in the prompt. If a tasks block exists but no tasks are due and no system event needs handling, the run skips as `no-tasks-due`. Task timestamps are stored by agent id, session key, and task name.

Non-task prose from `HEARTBEAT.md` is appended as additional context. If the base prompt mentions `HEARTBEAT.md`, Friday also appends the resolved workspace path.

## Prompt And Agent Turn

The default prompt is:

```text
Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.
```

Prompt assembly is in `src/main/heartbeat/prompt.ts`.

- Exec-completion events use an exec-specific prompt and can relay command output when delivery is enabled.
- Cron/system events use a reminder prompt.
- Due tasks are listed as the only due `HEARTBEAT.md` tasks for the current run.
- Every prompt includes current time as an ISO timestamp.
- Heartbeat runs force the `heartbeat_respond` tool into the agent tool set.

The agent run passes heartbeat-specific options into `AgentService.send()`:

- `model`
- `timeoutSeconds`
- `lightContext`
- `suppressToolErrorWarnings`
- `enableHeartbeatTool`
- `forceHeartbeatTool`
- `suppressAgentEvents`

## Response Contract

Responses are normalized by `src/main/heartbeat/response.ts`.

- `heartbeat_respond` takes precedence over plain text.
- `heartbeat_respond` with `notify: false` becomes an OK result.
- `heartbeat_respond` with `notify: true` uses `notificationText` or `summary` as alert text.
- Empty text becomes `ok-empty`.
- `HEARTBEAT_OK` at the start or end of a text response is stripped. If the remaining text is empty or within `ackMaxChars` (default `300`), the result becomes `ok-token`.
- Text that does not reduce to an OK result becomes an alert.

## Delivery

Delivery uses the same channel registry as normal outbound messages.

- `target: "none"` records status but sends no chat message.
- `target: "last"` uses the latest `channel:route` event for the session, falling back to the latest route globally.
- Explicit channel targets resolve through channel plugins. Plugins can parse explicit target strings, select default accounts, infer chat type, and provide default recipients.
- `directPolicy: "block"` skips direct-message delivery with `dm-blocked`.
- Channel/account heartbeat visibility controls `showOk`, `showAlerts`, and `useIndicator`.
- Alert delivery suppresses identical text for 24 hours per base session.
- OK delivery sends `HEARTBEAT_OK` only when `showOk` is enabled.
- Channel plugins may receive heartbeat typing calls before and after the run.

## State And Safety

Heartbeat state is intentionally small.

- Runtime state lives in the app store under `heartbeat`.
- `taskState` tracks due-task last-run timestamps.
- `lastDelivered` tracks recently delivered alert text for duplicate suppression.
- `lastHeartbeat` is held in service memory and exposed through IPC for the settings UI.
- Heartbeat events are emitted on the event bus and broadcast to renderer listeners.

Heartbeat prompts and `HEARTBEAT.md` become model input, so they must not contain secrets. Scheduled runs create provider cost, so cadence, active hours, model, and delivery target should be configured deliberately.

## IPC And UI

Renderer access is exposed through `window.heartbeat`:

- `status()`
- `last()`
- `setEnabled({ enabled })`
- `getTiming()`
- `updateTiming({ every, activeHours })`
- `systemEvent({ text, mode, agentId, sessionKey, heartbeat })`
- `request(wake)`
- `onEvent(callback)`

The settings page at `/settings/heartbeat` uses these calls to toggle runtime heartbeat, edit cadence and active hours, send manual wakes, queue system events, and display the latest heartbeat event.

## Source Map

- `src/main/heartbeat/service.ts` - scheduler, run flow, delivery, IPC-facing service methods
- `src/main/heartbeat/config.ts` - config defaults, per-agent resolution, system-prompt enablement
- `src/main/heartbeat/wake.ts` - wake queue, coalescing, retry behavior
- `src/main/heartbeat/cooldown.ts` - not-due, minimum-spacing, and flood deferral
- `src/main/heartbeat/schedule.ts` - stable phase scheduling and active-hour slot seeking
- `src/main/heartbeat/active-hours.ts` - active-hours parsing and timezone handling
- `src/main/heartbeat/prompt.ts` - `HEARTBEAT.md`, task parsing, event prompts
- `src/main/heartbeat/response.ts` - `HEARTBEAT_OK` and `heartbeat_respond` normalization
- `src/main/heartbeat/state.ts` - task state and duplicate-alert storage
- `src/main/heartbeat/visibility.ts` - channel/account visibility resolution
- `src/shared/heartbeat.ts` - shared config, IPC, event, and wake types
- `src/main/ipc/heartbeat-ipc.ts` - main-process IPC handlers
- `src/renderer/src/pages/settings/pages/heartbeat/Page.tsx` - settings UI
