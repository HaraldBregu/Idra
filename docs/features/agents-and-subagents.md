# Agents And Subagents

Friday's core feature is a personal AI assistant that runs agent turns from the desktop app, channels, cron, heartbeat, and background tasks. The same runtime also supports child subagent runs for delegated work.

## Functionality

- Resolves the active provider and model from settings.
- Loads and saves durable session history.
- Builds the system prompt from workspace context, startup files, selected tools, selected skills, and heartbeat context when enabled.
- Selects and normalizes tools for the current provider.
- Streams run state, reasoning summaries, text deltas, tool calls, and tool results to the renderer event bus.
- Handles cancellation, context overflow compaction, run logging, and session persistence.
- Supports multiple configured agents with per-agent workspace, model, skills, tool policy, and subagent policy.
- Supports agent route bindings for channel/account/peer based sessions.

## Subagents

Subagents are isolated child agent sessions started from the current agent run. The `sessions_spawn` tool creates a tracked background task of type `subagent.run`. The `subagents` control tool can list, cancel, or inspect child runs owned by the current session.

Subagent spawn input supports:

- `task`: child agent instruction.
- `taskName` and `label`: short labels for status and history.
- `agentId`: optional target agent.
- `model`: optional model override using either a model id or `provider/model`.
- `runTimeoutSeconds`: optional timeout.
- `cleanup`: `keep` or `delete`.
- `sandbox`: `inherit` or `require`.

The spawn service records parent/child metadata, creates a child session key, applies inherited tool allow/deny lists, and enforces configurable limits. Defaults are one spawn level and four active children per parent agent unless the agent config overrides them.

## Current Limits

- `sessions_spawn` mode `session` is not supported yet.
- `sessions_spawn` context `fork` is not supported yet.
- Leaf subagents cannot spawn or control more children.
- Cross-agent spawning must be allowed by the parent agent's `subagents.allowAgents` policy.
- Restricted agents cannot spawn less-restricted child agents.
- `sandbox: require` needs a restricted target agent.

## Source

- `src/main/service.ts`
- `src/main/agent/run.ts`
- `src/main/agent/system-prompt.ts`
- `src/main/agent/subagents`
- `src/main/store/types.ts`
- Existing docs: `docs/modules.md`, `docs/multi-agent-spawn-implementation-plan.md`

