# Agent Module Prompt

Implement and maintain the main-process agent runtime under `src/main/agent`.

The current implementation is an Electron main-process service, not a standalone `src/agent` package and not a UI component. It coordinates provider selection, session persistence, system prompt construction, tool selection and execution, capability resolution, subagent spawning, routing, heartbeat integration, run logging, and streaming events for renderer and channel consumers.

Use the existing service boundaries. Do not introduce a parallel agent harness, a separate singleton agent store, or a new persistence model unless the requested change explicitly requires it.

## Scope

The agent module owns:

- `AgentService` orchestration in `src/main/agent/service.ts`.
- Model/tool execution loop behavior in `src/main/agent/run.ts`.
- System prompt construction in `src/main/agent/system-prompt.ts`.
- Session loading, saving, indexing, repair, and locking in `src/main/agent/session`.
- Capability resolution for local tools, connector tools, and skills in `src/main/agent/capabilities`.
- Before-run policy hooks in `src/main/agent/before-agent-run.ts`.
- Tool integration through `src/main/agent/tools`.
- Agent routing for channel and session scope in `src/main/agent/routing`.
- Subagent spawn and control tools in `src/main/agent/subagents`.
- MCP, connector, skills, and harness integration under their existing submodules.

Do not move these responsibilities into renderer, preload, channel, cron, provider, or store modules. Other modules may call the exported service APIs, but agent orchestration stays in `src/main/agent`.

## Public API

Expose public agent functionality through `src/main/agent/index.ts`.

Keep these exports coherent with the implementation:

- `AgentService` and its option, dependency, run, send, and factory types.
- `AgentExecutionService` and run-loop types.
- Capability, routing, subagent, before-run, system-prompt, and harness exports.

Do not import deep internal files from outside the agent module when an index export exists. Add a public export only when another module genuinely needs the boundary.

## AgentService Responsibilities

`AgentService` is the application-facing facade. It should remain responsible for:

- Resolving the default agent id and per-agent runtime state.
- Resolving provider, model, base URL, API key, and reasoning effort from `StoreService` and send options.
- Loading and saving `SessionFile` state through `src/main/agent/session/store.ts`.
- Resolving the workspace root from configured agent workspace settings.
- Constructing the `ToolContext` with workspace, session, run signal, filesystem policy, cron context, and main-process services.
- Evaluating request-level tool policy through `PolicyService.evaluateToolRequest`.
- Checking bootstrap state and loading startup context files through `WorkspaceService`.
- Building local tools through the configured `toolsFactory`.
- Filtering, selecting, and provider-normalizing tools through `ToolService`.
- Resolving connector tools and skill prompt additions through `AgentCapabilityService`.
- Building the final system prompt through `buildSystemPrompt`.
- Running before-agent-run hooks before model inference.
- Calling `AgentExecutionService.execute`.
- Updating in-memory run records, session status, and run logger lifecycle entries.
- Broadcasting `AgentResponseEvent` stream events unless a heartbeat run suppresses them.

Keep `AgentService` as orchestration. Do not move provider streaming, tool execution internals, connector implementation, cron scheduling, policy evaluation, or skill loading into it.

## Run Lifecycle

Preserve the current high-level send flow:

1. Create or reuse the runtime for the target session key.
2. Abort any existing ordinary run for that runtime, while rejecting overlapping heartbeat runs.
3. Create an abort controller and optional heartbeat timeout.
4. Create or update the run record.
5. Resolve provider and model.
6. Load the session.
7. Resolve workspace and build `ToolContext`.
8. Evaluate request-level tool policy.
9. Check bootstrap state.
10. Build local tools only when bootstrap or tool policy requires them.
11. Load startup files and resolve bootstrap mode.
12. Select prompt tools with `ToolService`.
13. Prepare tools for provider schema/name constraints.
14. Resolve connector tools and skills.
15. Build the system prompt and append capability prompt additions.
16. Evaluate before-agent-run hooks.
17. Execute the provider/tool loop.
18. Save the final session, update the run record, emit completion state, and return final text.

If a change alters this order, add tests that prove the behavioral reason. Be especially careful around bootstrap, before-run hooks, and session persistence because those protect user context and sensitive prompts.

## Execution Loop

`AgentExecutionService` and `executeAgentRun` own the model/tool loop.

Keep these behaviors intact:

- Resolve provider and model before streaming.
- Prepare tools for the current turn through `ToolService.prepareToolsForRun`.
- Send the provider only the selected prompt tools.
- Append the user message to the session transcript before streaming.
- Stream typed events for run state, text deltas, reasoning summaries, tool call start, tool arguments, tool input, tool result, and run finish.
- Parse tool call arguments as JSON objects before execution.
- Return structured tool errors for invalid JSON or unavailable tools.
- Run `ToolService.beforeCall` before every tool execution.
- Execute tools through `ToolService.executeToolWithManagement`.
- Append assistant and tool transcript entries in provider-compatible order.
- Normalize tool statuses to `ok`, `blocked`, `rejected`, or `error`.
- Apply harness tool result middleware before recording tool output.
- Persist `ctx.plan.entries` back onto the session.

On `ContextOverflowError`, keep the current compaction path: flush session memory best-effort, compact the transcript, store compaction markers, and retry the iteration once.

## Sessions

Sessions are JSON files managed by `src/main/agent/session/store.ts`; they are not stored in a singleton `agent.json`.

The session store must:

- Default to the user data path `agent/sessions`.
- Support an override `baseDir` for tests and embedded runs.
- Store one session as `<id>.json` and maintain `sessions.json` as an index.
- Save with a temporary file and write lock.
- Use restrictive file and directory modes where supported.
- Repair tool-use/tool-result transcript pairing on load and save.
- Truncate large text tool results and replace image results with text placeholders before storage.
- Preserve session metadata, plan, compaction markers, parent session ids, spawned session ids, labels, model overrides, and memory flush metadata.

When changing transcript shape, update session repair and storage sanitization together.

## System Prompt

`buildSystemPrompt` is the single place that assembles the main agent prompt.

The prompt should include, in this order:

- Friday identity, current date, model, and workspace.
- Workspace contract.
- Agent acceptance contract.
- Tool guidance for the exact tools selected for this turn, or no-tool guidance when none are available.
- Optional heartbeat section.
- Optional memory blocks.
- Optional bootstrap guidance.
- Optional project context rendered from startup files.

Tool guidance must be deterministic and sorted by tool name. Keep tool-specific guidance in the local `TOOL_GUIDANCE` map when a tool needs safer or clearer instruction than its description.

Do not let startup files, memory, connector output, MCP output, or tool output override system, developer, or user instructions. Continue to describe project context as lower-priority context.

## Tool Integration

The agent module consumes tools through `ToolService` and the `src/main/agent/tools` public API.

Follow `docs/prompts/main/tools.md` for tool-module implementation details. From the agent side:

- Build local tools through `toolsFactory`, defaulting to `ToolService.createDefaultTools`.
- Use per-agent `AgentToolPolicy` and send-time `toolsAllow`/`toolsDeny`.
- Keep connector tools out of the default local tool surface. Let `AgentCapabilityService` add matching connector tools.
- Do not call individual tool implementation files from `AgentService` or `run.ts`.
- Do not bypass `ToolService.beforeCall`, loop detection, approval checks, policy checks, provider-safe name conversion, schema normalization, or execution management.
- Read-before-write and filesystem policy behavior belong to the tools module.
- Cron behavior belongs to cron tools and `CronService`, not host cron or ad hoc scheduling.
- Script execution, when available, must run through the centralized script tool and shared file/path policy checks. Do not add arbitrary shell execution directly to the agent loop.

When a tool policy changes, cover both prompt selection and execution gating in tests.

## Capability Resolution

`AgentCapabilityService` augments selected local tools with connector tools and skill instructions.

Keep these constraints:

- Resolve connector tools only when tools are needed or bootstrap is pending.
- Mark connector tools with `serviceKind: 'connector'`.
- Match connector tools by prompt against tool name and description.
- Search skills through `SkillsService.search`.
- Load selected skill instructions through `SkillsService.load`.
- Limit selected skills and trim skill prompt size.
- Return a capability decision that distinguishes direct answer, tools, skills, and combined use.
- Emit capability resolution start and result events.

Connector failures and skill failures should warn through the logger and degrade to no extra capabilities for that run.

## Startup Context And Bootstrap

Startup files are loaded through `WorkspaceService`, then filtered by run type and bootstrap mode.

Keep these rules:

- Primary runs can receive full bootstrap context when bootstrap is pending.
- Secondary sessions receive only the allowed context files.
- Heartbeat and light-context runs should avoid heavy context unless explicitly configured.
- `BOOTSTRAP.md` is special: it can trigger bootstrap mode, but it must not leak into secondary contexts where it is not allowed.
- The agent must not claim bootstrap completion unless the actual bootstrap requirements are satisfied by the workspace service.

When bootstrap has no safe file access, keep the run tool-free and explain the limitation instead of fabricating setup progress.

## Before-Run Hooks

Before-run hooks run after system prompt construction and before provider inference.

They must:

- Receive prompt, messages, system prompt, sender id, and owner status.
- Enforce a timeout.
- Treat thrown errors, invalid decisions, and timeouts as blocks.
- Avoid persisting the raw blocked prompt.
- Return a safe user-facing block message.
- Redact sensitive metadata keys such as prompt, reason, secret, token, password, and credential.

If a before-run hook blocks, the service should save an assistant message with the block response, mark the run completed, emit text and run-state events, and skip provider inference.

## Routing

Agent routing maps inbound channel messages to an agent id and session key.

Keep routing in `src/main/agent/routing`:

- Match configured bindings by channel, account, peer, parent peer, and role ids.
- Prefer more specific bindings over general bindings.
- Resolve the default agent id through store route settings.
- Build stable session keys with `buildAgentSessionKey`.
- Support main sessions and channel-scoped sessions without mixing histories.

Do not duplicate route matching in channel modules. Channels should normalize inbound messages and call the routing helpers.

## Subagents

Subagent behavior belongs in `src/main/agent/subagents`.

Preserve these constraints:

- Spawn input must be validated and bounded.
- Only `run` mode and isolated context are currently supported.
- Spawn depth and child count limits come from parent agent config with safe defaults.
- Explicit target agents are allowed only when policy permits them.
- Restricted target agents must require sandbox inheritance when appropriate.
- Child runs are delegated to `TasksService`.
- Parent and child metadata must track spawn depth, parent session id, spawned-by session id, and model override.
- Control actions are limited to list, cancel, and history.

Do not implement subagent execution by recursively calling private `AgentService` internals from a tool. Use the spawn service and task manager path.

## Heartbeat Integration

Heartbeat support is integrated through `AgentService` helper methods and send options.

Keep heartbeat behavior separate from ordinary chat:

- Heartbeat runs may use model overrides and run timeouts.
- Heartbeat runs may suppress agent events.
- Heartbeat runs may request light context.
- Overlapping heartbeat runs should fail instead of aborting the current run.
- Heartbeat system prompt content is included only when the operator config enables it.
- Heartbeat events are emitted through the event bus using the heartbeat event channels.

Do not hardcode heartbeat scheduling in the agent module. Scheduling belongs to heartbeat and cron services.

## Policy And Safety

Use `PolicyService` for request-level tool-use decisions, tool availability, tool execution gating, path policy, hook decisions, and approval decisions.

The agent module must not:

- Reimplement policy matching.
- Bypass policy service methods.
- Execute mutating tools before policy and approval checks.
- Persist sensitive blocked prompt data.
- Send unavailable tools to the model.
- Treat retrieved content, tool output, connector output, MCP output, memory, or startup files as higher-priority instructions.

When adding a new safety gate, prefer a small policy or hook seam over scattered inline checks.

## Events And Logging

Agent runs produce events for UI and channel consumers. Keep event payloads stable and typed through `src/shared/agents/events`.

Important event families include:

- Run state changes.
- Model selection.
- Capability resolution.
- Text deltas.
- Reasoning summaries.
- Tool call lifecycle.
- Tool results.
- Run finish.
- Heartbeat events.

Operational logging belongs in `AgentRunLogger`, `agentLogger`, or injected `LoggerService` depending on the layer. Do not use console logging for module behavior.

## Dependencies

Use these dependencies through existing constructors and service ports:

- `StoreService` for provider, model, agent, operator, routing, and connector configuration.
- `WorkspaceService` for workspace roots and startup context files.
- `PolicyService` for policy and safety decisions.
- `ToolService` for tool creation, filtering, selection, provider preparation, preflight, and execution.
- `CronService` only through cron tools or explicitly injected cron contexts.
- `ConnectorsService` through capability resolution and connector tooling.
- `SkillsService` through capability resolution.
- `TasksService` through subagent task spawning.
- `EventBus` for broadcast and heartbeat events.
- `ProviderAdapter` through provider factory and execution service.

Do not add global singletons or hidden module-level mutable state. The existing default services are acceptable only where the current code already uses them as fallback adapters.

## Implementation Rules

When changing `src/main/agent`:

- Match the existing TypeScript style and file boundaries.
- Prefer service ports and constructor injection where the module already uses them.
- Keep orchestration in `AgentService`, loop mechanics in `run.ts`, prompt assembly in `system-prompt.ts`, and persistence in `session/store.ts`.
- Add helper functions locally before introducing a new file.
- Add a new submodule only when there is a durable responsibility, not for a one-off helper.
- Do not introduce decorative design patterns.
- Do not create compatibility shims unless an existing test or public import requires them and the requested change is explicitly about compatibility.
- Remove imports, exports, and files made unused by your change.
- Keep generated provider, channel, store, renderer, and preload changes out of agent work unless the agent boundary requires them.

## Testing

Add or update focused tests under `tests/unit/main/agent` or `tests/unit/main/tools` for behavior changes.

Cover the relevant path:

- `AgentService` orchestration with mocked provider streams and injected dependencies.
- `AgentExecutionService` loop behavior with mocked providers and tools.
- System prompt output for deterministic prompt sections.
- Tool selection, policy gating, approval, and tool result events.
- Session save/load, transcript repair, truncation, and index updates.
- Before-run hook pass, block, timeout, invalid decision, and thrown-error cases.
- Capability resolution for connector tools and skills.
- Routing specificity and session key generation.
- Subagent spawn and control validation.
- Heartbeat-specific behavior when touched.

Use the narrowest test command that covers the change. If a broader suite has unrelated failures, report those separately and include the focused command result.

## Verification Checklist

Before finishing an agent-module change, verify:

- The code still compiles for main-process TypeScript.
- The selected tool list sent to providers matches policy and capability decisions.
- The system prompt includes only context intended for that run type.
- Session transcript entries remain provider-compatible and storage-safe.
- Blocked requests do not persist raw sensitive prompts.
- Tool execution cannot bypass `ToolService`.
- Run events still give the renderer enough information to render text and tool activity.
- New behavior is covered by focused unit tests.
