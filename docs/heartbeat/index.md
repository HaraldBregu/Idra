# Heartbeat

Heartbeat runs periodic agent turns in the main session so the model can surface
anything that needs attention without spamming the user.

A heartbeat is a scheduled main-session turn. It does not create a background
task record. Task records are reserved for detached work such as ACP runs,
subagents, isolated cron jobs, and other agent runs that need their own visible
lifecycle.

## Quick Start

Leave heartbeats enabled unless the user explicitly wants them disabled. The
default cadence is every 30 minutes. When Anthropic OAuth or token-based auth is
detected, including Claude CLI reuse, the default cadence is every 1 hour.

Add a small `HEARTBEAT.md` file only when the workspace needs stable heartbeat
instructions. Keep that file short. It should usually contain a checklist,
small reminders, or a structured tasks block for periodic checks.

Decide where heartbeat messages should go. The default target is `none`, which
runs the heartbeat without external delivery. Use `last` when the heartbeat
should route alerts to the last contacted external channel.

Optional tuning should stay deliberate:

- Enable reasoning delivery only when the user wants visibility into why the
  heartbeat alerted.
- Use light context when heartbeat turns only need `HEARTBEAT.md`.
- Use isolated sessions to avoid sending the full conversation history on every
  heartbeat.
- Restrict heartbeats to active hours when the user wants quiet time.
- Skip heartbeats while the agent is busy when concurrent local-model work would
  be expensive or confusing.

## Defaults

Heartbeat interval defaults to 30 minutes, or 1 hour for Anthropic OAuth or
token auth. Setting the interval to `0m` disables heartbeats.

The default heartbeat prompt tells the agent to read `HEARTBEAT.md` if it exists
in the workspace, follow it strictly, avoid inferring or repeating old tasks
from prior chats, and reply with `HEARTBEAT_OK` when nothing needs attention.

The heartbeat prompt is sent verbatim as the user message. The system prompt
adds heartbeat-specific guidance only when heartbeats are enabled for the
default agent, and the run is flagged internally as a heartbeat.

When heartbeats are disabled with `0m`, normal runs also omit `HEARTBEAT.md`
from bootstrap context. This keeps heartbeat-only instructions out of ordinary
chat turns.

Active hours are checked in the configured timezone. Outside the active window,
the heartbeat is skipped until the next scheduled tick inside the window.

Heartbeats automatically defer while cron work is active or queued. When
`skipWhenBusy` is enabled, a heartbeat also defers while that same agent has its
own session-keyed subagent or nested command work in flight. Busy work in a
sibling agent should not pause unrelated agents.

## What The Prompt Is For

The default prompt is intentionally broad. It lets the agent consider
outstanding follow-ups, inboxes, reminders, queued work, and completed
background tasks, then surface only items that need attention.

The prompt can also support a lightweight human check-in during daytime. This
should be occasional, short, and bounded by the configured local timezone so it
does not create night-time spam.

A heartbeat can react to completed background tasks. The heartbeat run itself
still does not create a task record.

Use a custom heartbeat prompt when the user wants a specific periodic check,
such as verifying gateway health, scanning a mailbox, or reviewing a particular
operational queue. A custom prompt replaces the default body rather than merging
with it.

## Response Contract

If nothing needs attention, the agent should reply with `HEARTBEAT_OK`.

Tool-capable heartbeat runs may use a structured heartbeat response. A silent
acknowledgment should set notification delivery to false. An alert should set
notification delivery to true and provide short notification text. When a
structured response is present, it takes precedence over plain text.

During heartbeat runs, `HEARTBEAT_OK` is treated as an acknowledgment only when
it appears at the start or end of the reply. The token is stripped before
delivery. If the remaining content is within the configured acknowledgment
length, the reply is dropped.

If `HEARTBEAT_OK` appears in the middle of a reply, it is treated as ordinary
text.

For alerts, do not include `HEARTBEAT_OK`. Return only the alert content.

Outside heartbeat runs, stray `HEARTBEAT_OK` tokens at the start or end of a
message are stripped and logged. A normal message that contains only
`HEARTBEAT_OK` is dropped.

## Scope And Precedence

Default agent heartbeat settings apply globally. Per-agent heartbeat settings
merge on top of those defaults.

If any configured agent has its own heartbeat block, only agents with heartbeat
blocks run heartbeats. This lets one ops-focused agent run periodic checks while
the main agent stays quiet.

Channel visibility settings have their own precedence. Per-account channel
heartbeat settings override per-channel settings. Per-channel settings override
channel defaults. Channel defaults override built-in defaults.

## Per-Agent Heartbeats

Per-agent heartbeats are useful when the user wants only a specific agent to run
periodic checks. The per-agent block inherits shared defaults and overrides only
the fields it needs, such as cadence, target channel, recipient, timeout, or
prompt.

If any agent in the list declares a heartbeat block, heartbeats become opt-in
for that list. Agents without a heartbeat block do not run periodic heartbeats.

## Active Hours

Active hours restrict heartbeat runs to a local time window. The start time is
inclusive and the end time is exclusive. `24:00` is allowed as an end-of-day
value.

When a timezone is omitted or set to the user timezone, Friday uses the
configured user timezone when available and otherwise falls back to the host
system timezone. The `local` timezone always means the host system timezone. An
IANA timezone identifier can also be used directly.

If the start and end times are equal, the window has zero width. Heartbeats are
always skipped in that case.

For 24-hour operation, omit active hours entirely or use a full-day window from
`00:00` to `24:00`.

## Multi-Account Routing

Heartbeat delivery can target a specific account on channels that support
multiple accounts. The account id is used with the selected target channel.

When the target is `last`, the account id applies only if the resolved last
channel supports accounts. If the account id does not match a configured
account for that channel, delivery is skipped.

Some channels also support recipient overrides, such as phone numbers, chat ids,
topics, or thread ids. The exact recipient format belongs to the target channel.

## Field Notes

`every` controls the heartbeat cadence. It accepts a duration string. The
default unit is minutes. A value of `0m` disables heartbeat scheduling.

`model` optionally overrides the model for heartbeat runs.

`includeReasoning` delivers a separate reasoning message when reasoning is
available. This should usually stay off in group chats because it can expose
more internal detail than the final alert.

`lightContext` keeps heartbeat bootstrap context small. When enabled, heartbeat
runs keep only `HEARTBEAT.md` from workspace bootstrap files.

`isolatedSession` runs each heartbeat in a fresh session with no previous
conversation history. This greatly reduces token cost and works well with light
context.

`skipWhenBusy` defers heartbeats while that agent has its own extra busy lanes,
such as session-keyed subagent work or nested command work. Cron lanes always
defer heartbeats even when this flag is not enabled.

`session` chooses the session key for heartbeat runs. The main session is the
default. An explicit session key can route heartbeat turns to a known session.

`target` controls delivery. `none` runs without external delivery. `last` sends
to the last used external channel. An explicit channel id sends through that
configured channel.

`directPolicy` controls direct-message delivery. `allow` permits direct or DM
delivery. `block` suppresses direct or DM delivery.

`to` optionally overrides the recipient for the selected channel.

`accountId` optionally selects an account on multi-account channels.

`prompt` replaces the default heartbeat prompt. It is not merged with the
default prompt.

`ackMaxChars` controls how much content may remain after `HEARTBEAT_OK` before
an acknowledgment is still considered safe to drop.

`suppressToolErrorWarnings` suppresses tool error warning payloads during
heartbeat runs.

`activeHours` restricts heartbeat runs to a time window with a start time, end
time, and optional timezone.

## Delivery Behavior

Heartbeat routing has two separate concerns: where the heartbeat runs, and where
the result is delivered. Session settings control the run context. Target,
recipient, and account settings control delivery.

By default, successful OK acknowledgments are silent and alert content is
delivered. Channel visibility settings can change that behavior.

`showOk` sends an OK acknowledgment when the model returns an OK-only response.

`showAlerts` sends alert content when the model returns a non-OK response.

`useIndicator` emits indicator events for UI status surfaces.

If all three visibility controls are false, Friday skips the heartbeat run
entirely and does not call the model.

Heartbeat state is audit-oriented and small. Runtime state records last run
times and last delivered text by key. Heartbeat runs do not become background
task records.

Heartbeat runtime state must be stored and retrieved through `StoreService`.
`HeartbeatService` should use `getHeartbeatState()` and `setHeartbeatState()`
from its injected store dependency, not read or write the Electron store
directly or keep a second persistent cache.

Heartbeat is a service module with explicit dependencies: store, logger,
event bus, startup files, and optional agent service and channel registry
dependencies. Runtime code should use those injected dependencies rather than
global singletons.

Renderer access goes through the dedicated heartbeat preload and IPC module.
`window.heartbeat` can read heartbeat status, last delivery, and timing
settings, and can set heartbeat timing, enabled state, system events, and
manual wake requests through `HeartbeatIpc` and `HeartbeatChannels`. Heartbeat
renderer writes should use those heartbeat-specific IPC channels instead of a
generic store or app IPC path.

## HEARTBEAT.md

`HEARTBEAT.md` is optional. When present, it acts as the heartbeat checklist for
the workspace. Keep it tiny, stable, and safe to consider every heartbeat tick.

Good content includes urgent-inbox checks, calendar prep reminders, blocked-task
notes, or a short instruction to ask the user when a specific dependency is
missing.

The file may also contain a small structured tasks block. Each task can have a
name, interval, and prompt. Task mode is useful when one heartbeat file holds
several periodic checks and not all of them should run on every tick.

On normal runs, `HEARTBEAT.md` is injected only when heartbeat guidance is
enabled for the default agent. Disabling heartbeat cadence with `0m`, or
disabling the heartbeat system-prompt section, keeps the file out of normal
bootstrap context.

On the native Codex harness, `HEARTBEAT.md` content is not injected directly
into the turn. If the file exists and contains non-whitespace content, the
heartbeat collaboration-mode instructions point Codex at the file and tell it to
read it before proceeding.

If `HEARTBEAT.md` exists but is effectively empty, Friday skips the heartbeat run
to save API calls. A file with only blank lines and markdown headings counts as
empty. If the file is missing, the heartbeat still runs and the model decides
what to do.

The agent can update `HEARTBEAT.md` when the user asks it to. A heartbeat prompt
can also explicitly allow proactive updates when the checklist becomes stale.

Do not put secrets in `HEARTBEAT.md`. API keys, private tokens, phone numbers,
and other sensitive values would become prompt context.

## Manual Wake

A manual wake enqueues a system event and asks heartbeats to run outside the
normal cadence.

Use immediate mode when the heartbeat should run now. Use next-heartbeat mode
when the event should wait for the next scheduled tick.

If multiple agents have heartbeat configured, a manual wake runs each configured
agent heartbeat.

## Reasoning Delivery

Heartbeat runs normally deliver only the final answer payload.

Enable reasoning delivery only when the user wants transparency into why the
agent decided to send an alert. Reasoning is delivered as a separate Thinking
message when available.

Reasoning delivery can be helpful when an agent manages multiple sessions or
Codex instances. It can also leak more internal detail than desired, so it
should usually remain disabled for shared channels and group chats.

## Cost Awareness

Heartbeats run full agent turns. Shorter intervals use more tokens.

Use isolated sessions to avoid sending full conversation history. Use light
context to limit bootstrap files to `HEARTBEAT.md`. Use a cheaper model when the
checks are simple. Keep `HEARTBEAT.md` small. Use `target: none` when the user
wants internal state updates without external delivery.

## Troubleshooting

If a heartbeat run previously used a smaller local model and the next
main-session turn reports context overflow, reset the session runtime model back
to the configured primary model.

Current heartbeat runs preserve the shared session's existing runtime model
after completion. Isolated sessions avoid this class of problem by running
heartbeats in a fresh session. Light context further reduces the prompt size.

If heartbeats are unexpectedly silent, check active hours, channel visibility,
direct-message policy, account routing, and whether all visibility controls are
disabled. Also check whether cron work or busy agent lanes are causing deferral.

## Related

Heartbeat is related to automation, but it is not a task record. Use
[background tasks](../tasks/background/index.md) for detached agent work that
starts now. Use [scheduled tasks](../tasks/scheduled/index.md) for saved future
or recurring agent runs that should create background task records when due.
