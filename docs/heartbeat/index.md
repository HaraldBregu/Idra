# Heartbeat

Heartbeat runs periodic agent turns so Friday can surface important follow-ups
without creating a background task record.

## Functionality

A heartbeat is a scheduled main-session or configured-session agent run. It can
check a workspace heartbeat file, use a custom prompt, run with light context,
run in an isolated session, respect active hours, defer while related work is
busy, and optionally deliver alerts through a channel.

Heartbeat does not create task records. Background tasks and scheduled tasks
remain the visible lifecycle for detached work.

## Defaults

The default cadence is every 30 minutes. When Anthropic OAuth or token-style
auth is detected, the default cadence is one hour. Setting the cadence to `0m`
disables heartbeat scheduling.

The default prompt asks the agent to check heartbeat guidance when present,
avoid inventing stale tasks from earlier chats, and reply with `HEARTBEAT_OK`
when nothing needs attention.

The default delivery target is `none`, so the run can update state without
sending an external message. A target of `last` delivers alerts to the last
known external channel route. An explicit channel target sends through that
configured channel and can include account and recipient overrides.

## Configuration Scope

Default heartbeat settings apply to the default agent. Per-agent settings merge
on top of those defaults.

If any configured agent declares its own heartbeat block, heartbeats become
opt-in for that agent list. Agents without a heartbeat block do not run
periodic heartbeats.

Channel heartbeat visibility is resolved separately. Per-account visibility
overrides per-channel visibility, which overrides channel defaults, which then
falls back to built-in defaults.

## Scheduling

Heartbeat scheduling checks the configured cadence, active-hours window,
timezone, runtime visibility settings, and busy state before running.

Active hours use local wall-clock time in the configured timezone. The start is
inclusive and the end is exclusive. `24:00` is valid as an end-of-day value. A
zero-width window skips every run.

Heartbeats always defer while cron work is active or queued. When
`skipWhenBusy` is enabled, a heartbeat also defers while the same agent has
session-keyed subagent work or nested command work in flight.

Manual wake enqueues a system event and asks heartbeat scheduling to run now or
on the next heartbeat tick. When multiple agents have heartbeat configured, a
manual wake applies to each configured heartbeat agent.

## Prompt And Context

Heartbeat guidance can come from the default prompt, a custom prompt, and an
optional heartbeat file in the workspace. A custom prompt replaces the default
prompt body instead of merging with it.

Light context keeps startup context small and is useful when heartbeat turns
only need the heartbeat file. Isolated sessions avoid sending the main
conversation history on every tick.

When heartbeat scheduling is disabled, heartbeat-only workspace guidance is not
included in ordinary agent runs.

## Response Handling

`HEARTBEAT_OK` is treated as a silent acknowledgment only when it appears at the
start or end of a heartbeat reply. The token is stripped before delivery. If the
remaining content is within the configured acknowledgment length, the reply is
dropped.

If `HEARTBEAT_OK` appears in the middle of a reply, it is treated as normal
text. Alert replies should not include `HEARTBEAT_OK`.

Tool-capable heartbeat runs can use a structured heartbeat response. Structured
responses take precedence over plain text and can explicitly choose whether to
deliver a notification.

Outside heartbeat runs, stray `HEARTBEAT_OK` tokens at the start or end of a
message are stripped and logged. A normal message that contains only the token
is dropped.

## Delivery

Heartbeat routing separates where the run happens from where the result is
delivered. Session settings choose the run context. Target, recipient, account,
direct-message policy, and channel visibility choose delivery.

Successful OK acknowledgments are silent by default. Alerts are delivered by
default. Visibility settings can also send OK acknowledgments, suppress alerts,
emit indicator events, or skip the model call entirely when all visibility
outputs are disabled.

Reasoning delivery is optional. When enabled, available reasoning is delivered
as a separate thinking message. It should stay off for shared or group channels
unless the user explicitly wants that extra visibility.

## State

Heartbeat runtime state is deliberately small. It records last run times and
last delivered text by key. Configuration remains in the agent settings, while
runtime heartbeat state stays in the heartbeat store root.

Heartbeat runs resolve the current provider and model through the normal
store-backed agent execution path. Heartbeat state does not duplicate provider
records, API keys, model ids, or channel credentials.
