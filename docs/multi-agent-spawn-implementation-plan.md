# Multi-Agent Spawn Implementation Plan

## Goal

Implement OpenClaw-style multi-agent routing and `sessions_spawn`-style subagent orchestration in Friday, adapted to Friday's Electron main-process architecture.

The target system should let Friday:

1. Route inbound work to different configured agents by source, channel, account, peer, role, or explicit runtime choice.
2. Let an active agent spawn isolated child agent sessions for parallel or delegated work.
3. Track child runs as durable background work with clear lifecycle, limits, cancellation, and result delivery.
4. Keep provider adapters, tools, sessions, plugins, tasks, channels, heartbeat, and store boundaries explicit.

## Reference Model

The OpenClaw implementation is split into two systems:

1. Multi-agent routing: inbound channel or scheduled work resolves to an agent id and session key.
2. Spawned work: `sessions_spawn` starts a child session under a target agent and tracks it asynchronously.

Key OpenClaw reference files:

- `openclaw/src/routing/resolve-route.ts`
- `openclaw/src/agents/tools/sessions-spawn-tool.ts`
- `openclaw/src/agents/subagent-spawn.ts`
- `openclaw/src/agents/acp-spawn.ts`
- `openclaw/src/agents/subagent-registry.ts`
- `openclaw/src/agents/subagent-registry-run-manager.ts`
- `openclaw/src/agents/subagent-capabilities.ts`
- `openclaw/src/agents/subagent-target-policy.ts`

Friday should not copy OpenClaw's gateway shape directly. Friday should reuse its existing `AgentService`, `Tasks`, `Channels`, `Store`, `Plugins`, and provider-neutral run loop.

## What currently exists in Friday

- `AgentService` already owns normal assistant turns: provider/model resolution, session load/save, context, skills, tools, compaction, and streaming.
- `Tasks` already represent immediate background agent work, but currently behave as isolated task runs rather than parent-child subagent orchestration.
- `Channels` already receive and dispatch external chat messages.
- `Cron` and `Heartbeat` already trigger agent work outside the renderer.
- `Store` is the persistence boundary for settings and runtime configuration.
- `Plugins` already expose surfaces including tools, providers, channels, hooks, model catalogs, and agent harnesses.
- Existing docs already plan an agent harness layer, which should become the execution abstraction used by spawned agents rather than creating a parallel runner.

## Success Criteria

1. Friday can define multiple agents with separate model defaults, workspace defaults, tool policy, skills, identity, and runtime preferences.
2. Inbound channel messages can route to a configured agent through deterministic binding rules.
3. An agent can call a first-class `sessions_spawn` tool to start child work.
4. Spawned child sessions have unique session ids, lineage metadata, run limits, and tool policy derived from their depth and parent.
5. Spawned work is tracked through the task subsystem so renderer UI, channel delivery, cancellation, and diagnostics can use one background-work model.
6. Parent agents can see active child runs and receive completion events without polling loops.
7. Sandboxed or restricted agents cannot spawn less-restricted children.
8. Default behavior remains backward-compatible: one default agent, normal chat unchanged.

## Non-Goals

- Do not introduce OpenClaw's gateway process model.
- Do not implement ACP harness spawning until Friday's agent harness abstraction is landed.
- Do not require a store migration for existing sessions.
- Do not add renderer UI before the main-process contracts are stable.
- Do not expose cross-agent spawning without explicit allow policy.

## Proposed Architecture

### Agent Configuration

Add an explicit multi-agent config model in the store.

Suggested shape:

```ts
type AgentConfig = {
  id: string;
  default?: boolean;
  name?: string;
  workspace?: string;
  model?: {
    providerId?: string;
    modelId?: string;
  };
  skills?: string[];
  tools?: AgentToolPolicy;
  subagents?: {
    allowAgents?: string[];
    maxSpawnDepth?: number;
    maxChildrenPerAgent?: number;
    requireAgentId?: boolean;
    model?: {
      providerId?: string;
      modelId?: string;
    };
    runTimeoutSeconds?: number;
  };
};

type AgentRouteBinding = {
  agentId: string;
  match: {
    channel?: string;
    accountId?: string;
    peer?: { kind: "direct" | "group" | "channel" | "thread"; id: string };
    parentPeer?: { kind: "direct" | "group" | "channel"; id: string };
    roleIds?: string[];
  };
  session?: {
    scope?: "main" | "per-peer" | "per-channel-peer" | "per-account-channel-peer";
  };
};
```

Keep the default path simple: if no agents are configured, synthesize a `main` agent from current provider/model/workspace settings.

### Session Key Model

Introduce agent-scoped session keys while keeping existing session ids readable.

Suggested canonical forms:

- `agent:<agentId>:main`
- `agent:<agentId>:channel:<channelId>:peer:<peerId>`
- `agent:<agentId>:subagent:<uuid>`
- `agent:<agentId>:task:<uuid>`

Store session lineage metadata alongside session records:

```ts
type AgentSessionMetadata = {
  agentId: string;
  spawnedBy?: string;
  spawnDepth?: number;
  subagentRole?: "main" | "orchestrator" | "leaf";
  subagentControlScope?: "children" | "none";
  spawnedWorkspace?: string;
  inheritedToolAllow?: string[];
  inheritedToolDeny?: string[];
};
```

### Routing Service

Add `src/main/agent/routing` with:

- `resolveAgentRoute(input)`
- `buildAgentSessionKey(params)`
- `resolveDefaultAgentId(storeState)`
- binding normalization and validation helpers

Route priority should be deterministic:

1. exact peer
2. parent peer for thread inheritance
3. peer wildcard
4. role-specific group/channel match
5. account match
6. channel match
7. default agent

Channels should call this service before dispatching inbound messages to `AgentService`.

### Spawn Tool

Add a first-class local tool named `sessions_spawn`.

Suggested input:

```ts
type SessionsSpawnInput = {
  task: string;
  taskName?: string;
  label?: string;
  agentId?: string;
  model?: string;
  runTimeoutSeconds?: number;
  mode?: "run" | "session";
  cleanup?: "delete" | "keep";
  context?: "isolated" | "fork";
  sandbox?: "inherit" | "require";
};
```

Initial Friday implementation should support only native subagent runs:

- `runtime: "subagent"` is implicit.
- ACP/harness-backed spawning should be a later phase after the agent harness plan is implemented.
- `mode: "session"` can be deferred until channel thread binding exists.

### Spawn Service

Add `src/main/agent/subagents/spawn-service.ts`.

Responsibilities:

1. Validate `task`, `agentId`, `taskName`, mode, and options.
2. Resolve parent session and requester agent.
3. Resolve target agent and model override.
4. Enforce target policy:
   - same-agent allowed by default
   - cross-agent only if `allowAgents` contains the target or `"*"`
   - explicit `agentId` required if configured
5. Enforce depth and active-child limits.
6. Enforce sandbox/tool-policy inheritance.
7. Create a child session key.
8. Persist child session metadata before launching.
9. Build child system prompt and initial task message.
10. Launch the child through `AgentService.send()` or the future harness dispatch path.
11. Register the child run in the subagent registry and task subsystem.

Important constraint: spawned work should call the same execution path as normal agent work. Do not create a second provider loop.

### Subagent Registry

Add `src/main/agent/subagents/registry.ts`.

Track:

```ts
type SubagentRunRecord = {
  runId: string;
  childSessionKey: string;
  requesterSessionKey: string;
  controllerSessionKey: string;
  task: string;
  taskName?: string;
  label?: string;
  agentId: string;
  modelId?: string;
  providerId?: string;
  cleanup: "delete" | "keep";
  spawnMode: "run" | "session";
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  outcome?: "ok" | "error" | "timeout" | "cancelled";
  error?: string;
  expectsCompletionMessage?: boolean;
};
```

Registry operations:

- `registerSubagentRun`
- `listSubagentRunsForRequester`
- `countActiveRunsForSession`
- `completeSubagentRun`
- `cancelSubagentRun`
- `getSubagentRunByChildSessionKey`
- `restoreSubagentRuns`

Use the existing Tasks module as the public background-work surface. The subagent registry should be the lineage/control layer; Tasks should be the user-visible status layer.

### Parent Completion Delivery

Completion should be event-driven.

When a child run ends:

1. Mark the registry record completed.
2. Update the corresponding task.
3. Persist final session state.
4. Emit an internal event for the parent session.
5. Optionally deliver a completion message through the originating channel if the request came from a channel.

Parent prompts should receive an "active subagents" system prompt addition when child runs are active:

- child session key
- task name or label
- status
- instruction to wait for completion events instead of polling

### Control Tool

Add a second tool named `subagents`.

Suggested actions:

- `list`: list child runs controlled by this session
- `cancel`: cancel a child run
- `history`: read completed child summary

Defer `steer` until the run loop supports safe mid-run intervention.

### Tool Policy

Subagent tool policy should depend on depth:

- Main sessions can spawn and control children if tools allow it.
- Orchestrator subagents can spawn children until `maxSpawnDepth`.
- Leaf subagents cannot use `sessions_spawn`, `subagents`, session management tools, or high-risk direct-delivery tools.

Always deny from subagents unless explicitly justified:

- direct channel-send tools
- destructive store/config mutation tools
- provider credential tools
- plugin management tools

### Sandbox and Permission Rules

Spawn permissions must be monotonic:

- A restricted parent cannot spawn a less-restricted child.
- `sandbox: "require"` fails if the target agent would run unrestricted.
- Inherited deny rules must carry into the child.
- Inherited allow rules must not grant tools the target agent would otherwise deny.

This should be enforced before any child session is launched.

## Implementation Phases

### Phase 1: Agent Identity and Routing

Implementation:

1. Add agent config types to the store layer.
2. Add binding config types and validation.
3. Add route resolver and session-key helpers.
4. Update channel dispatch to resolve `{ agentId, sessionKey }` before calling `AgentService`.
5. Update cron, heartbeat, and task entrypoints to accept optional target `agentId`.

Verification:

- Existing normal chat still routes to synthetic `main`.
- Channel route binding selects the configured agent.
- Unmatched inbound work falls back to default agent.
- Session keys are stable for the same route input.

### Phase 2: Agent-Scoped Runtime Resolution

Implementation:

1. Teach `AgentService` to resolve provider/model/workspace/tool defaults from an agent id.
2. Merge per-agent settings over existing global settings.
3. Persist session metadata with `agentId`.
4. Ensure memory, skills, tools, and workspace context use the routed agent.

Verification:

- Two agents can use different provider/model defaults.
- Two agents do not share session history unless explicitly routed to the same session key.
- Current single-agent behavior remains unchanged.

### Phase 3: Native Subagent Spawn Tool

Implementation:

1. Add `sessions_spawn` to the canonical tool assembly path.
2. Add `SpawnService`.
3. Add subagent target policy and depth/capability helpers.
4. Launch child runs through `AgentService`.
5. Register child runs in both subagent registry and Tasks.

Verification:

- A parent run can spawn a child and continue without blocking the provider loop.
- Invalid target `agentId` returns a tool error.
- Cross-agent spawn fails unless allowlisted.
- Max depth and max children are enforced.

### Phase 4: Completion Events and Parent Awareness

Implementation:

1. Add subagent lifecycle events on start, completion, timeout, and cancellation.
2. Feed active-child context into parent prompts.
3. Add completion delivery to parent session and originating channel.
4. Add cleanup behavior for `cleanup: "delete"` and `cleanup: "keep"`.

Verification:

- Parent can observe child completion without polling.
- Channel-originated spawns send a clear completion update.
- Completed child runs leave the expected registry/task/session state.

### Phase 5: Subagent Control Tool

Implementation:

1. Add `subagents(action: "list" | "cancel" | "history")`.
2. Scope control to the current session's descendants.
3. Prevent sibling or unrelated session control.
4. Add task cancellation integration.

Verification:

- Parent can list only its own children.
- Cancel marks child task and registry state consistently.
- Leaf subagents cannot control children.

### Phase 6: Persistence and Recovery

Implementation:

1. Persist subagent registry records under the user-data root.
2. Restore active records on app startup.
3. Reconcile orphaned records against task/session state.
4. Mark interrupted child runs as failed or resumable based on available execution state.

Verification:

- App restart does not lose active child metadata.
- Stale records are cleaned or marked terminal.
- Renderer/task UI can display restored child work.

### Phase 7: Harness/ACP-Compatible Spawn

Prerequisite: complete the agent harness implementation plan.

Implementation:

1. Add `runtime?: "subagent" | "harness"` to `sessions_spawn`.
2. Resolve target harness from agent config or explicit option.
3. Initialize external harness session if needed.
4. Track harness-backed runs in the same registry and Tasks model.
5. Keep native subagent behavior as the default.

Verification:

- Built-in provider-native spawn still works.
- Forced harness spawn routes through the selected harness.
- Harness-backed child runs have the same lifecycle and policy guarantees.

### Phase 8: Renderer and Settings UI

Implementation:

1. Add agent management settings.
2. Add route binding settings.
3. Add subagent status in task/detail views.
4. Add controls for max depth, max children, cross-agent allowlists, and default child model.

Verification:

- Users can create at least two agents and bind a channel/source to each.
- Users can see active and completed subagent runs.
- Dangerous cross-agent settings are explicit and documented.

## Suggested File Layout

```txt
src/main/agent/routing/
  resolve-route.ts
  session-key.ts
  bindings.ts
  types.ts

src/main/agent/subagents/
  spawn-service.ts
  spawn-tool.ts
  control-tool.ts
  registry.ts
  registry-store.ts
  capabilities.ts
  target-policy.ts
  lifecycle.ts
  prompt-context.ts

src/main/store/
  agents.ts
```

## Suggested Tests

- Route resolver priority and fallback behavior.
- Agent-scoped session-key construction.
- Agent config validation.
- `AgentService` uses routed agent defaults.
- `sessions_spawn` accepts a valid same-agent child run.
- `sessions_spawn` rejects disallowed cross-agent targets.
- Depth and active-child limits.
- Sandbox monotonicity.
- Registry completion and task updates.
- Parent active-subagent prompt context.
- Restart recovery for active registry records.

## Rollout Order

1. Multi-agent config and route resolver.
2. Agent-scoped runtime resolution.
3. Native `sessions_spawn` as an internal tool.
4. Subagent registry and task integration.
5. Parent completion events.
6. Subagent control tool.
7. Persistence and recovery.
8. Harness-backed spawn.
9. Renderer settings and status UI.

## Open Questions

1. Should Friday's existing Tasks module become the only public representation of spawned work, or should subagents have a separate renderer surface?
2. Should route bindings live in the main settings store only, or should channel account configs own channel-specific bindings?
3. Should `context: "fork"` copy the full transcript immediately, or should it inject a summarized parent context into the child prompt?
4. Should spawned child output be automatically summarized before delivery to the parent?
5. Should child agents be allowed to write to the same workspace by default, or should cross-agent spawns default to each target agent's workspace?
