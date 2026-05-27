# Agent Module Prompt

Implement and maintain the main-process agent runtime as an Electron main-process service. The agent module coordinates provider selection, session persistence, system prompt construction, tool selection and execution, capability resolution, subagent spawning, routing, heartbeat integration, run logging, and streaming events for renderer and channel consumers.

Use the existing service boundaries. Do not introduce a parallel agent harness, a separate singleton agent store, or a new persistence model unless the requested change explicitly requires it.

## Scope

The agent module owns these responsibilities:

- `AgentService` orchestration.
- Model and tool execution loop behavior.
- System prompt construction.
- Session loading, saving, indexing, repair, and locking.
- Capability resolution for local tools, connector tools, and skills.
- Before-run policy hooks.
- Tool integration through the tools module.
- Agent routing for channel and session scope.
- Subagent spawn and control behavior.
- MCP, connector, skills, and harness integration under their existing module families.

Do not move these responsibilities into renderer, preload, channel, cron, provider, or store modules. Other modules may call exported service APIs, but agent orchestration stays inside the agent module.

## Module Names

Use existing module and folder names when extending the implementation:

- `service` for application-facing orchestration.
- `run` for provider loop mechanics and transcript updates.
- `system-prompt` for prompt assembly.
- `session` for durable conversation state.
- `capabilities` for connector and skill selection.
- `tools` for local tool construction, filtering, policy checks, approval checks, and execution.
- `routing` for channel-to-agent resolution.
- `subagents` for spawn and control behavior.
- `harness` for tool result middleware and run harness integration.
- `mcp`, `connectors`, and `skills` for their corresponding integrations.

Add a new module family only when it represents a durable responsibility. For one-off helpers, prefer local helper functions near the behavior they support.

## Public API

Expose public agent functionality through the agent index module.

Keep public exports coherent with the implementation:

- Export `AgentService` and its option, dependency, run, send, and factory types.
- Export the execution service and run-loop types.
- Export capability, routing, subagent, before-run, system-prompt, and harness types when outside modules need them.

Do not import private implementation modules from outside the agent boundary when an index export exists. Add a public export only when another module genuinely needs that boundary.

## AgentService Responsibilities

`AgentService` is the application-facing facade. Keep it responsible for orchestration only:

- Resolve the default agent id and per-agent runtime state.
- Resolve provider, model, base URL, API key, and reasoning effort from store settings and send options.
- Load and save session state through the session store.
- Resolve the workspace root from configured agent workspace settings.
- Construct `ToolContext` with workspace, session, run signal, filesystem policy, cron context, and main-process services.
- Evaluate request-level tool policy through `PolicyService`.
- Check bootstrap state and load startup context through `WorkspaceService`.
- Build local tools through the configured `toolsFactory`.
- Filter, select, and provider-normalize tools through `ToolService`.
- Resolve connector tools and skill prompt additions through `AgentCapabilityService`.
- Build the final system prompt through `buildSystemPrompt`.
- Run before-agent-run hooks before model inference.
- Call the execution service.
- Update in-memory run records, session status, and run logger lifecycle entries.
- Broadcast typed response events unless a heartbeat run suppresses them.

Do not move provider streaming, tool execution internals, connector implementation, cron scheduling, policy evaluation, or skill loading into `AgentService`.

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
13. Prepare tools for provider schema and provider name constraints.
14. Resolve connector tools and skills.
15. Build the system prompt and append capability prompt additions.
16. Evaluate before-agent-run hooks.
17. Execute the provider and tool loop.
18. Save the final session, update the run record, emit completion state, and return final text.

If a change alters this order, add tests that prove the behavioral reason. Be especially careful around bootstrap, before-run hooks, and session persistence because those protect user context and sensitive prompts.

## Execution Loop

The execution service owns the model and tool loop.

Keep these behaviors intact:

- Resolve provider and model before streaming.
- Prepare tools for the current turn through `ToolService`.
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
- Persist plan entries back onto the session.

On context overflow, keep the current compaction path: flush session memory best-effort, compact the transcript, store compaction markers, and retry the iteration once.

## Sessions

Sessions are JSON-backed conversation records managed by the session store. They are not stored in a singleton agent record.

The session store must:

- Store each session independently and maintain a session index.
- Support an override base directory for tests and embedded runs.
- Save with a temporary file and write lock.
- Use restrictive file and directory modes where supported.
- Repair tool-use and tool-result transcript pairing on load and save.
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

Tool guidance must be deterministic and sorted by tool name. Keep tool-specific guidance in the local guidance map when a tool needs safer or clearer instruction than its description.

Do not let startup files, memory, connector output, MCP output, or tool output override system, developer, or user instructions. Continue to describe project context as lower-priority context.

## Tool Integration

The agent module consumes local tools through `ToolService` and the tools public API.

From the agent side:

- Build local tools through `toolsFactory`, defaulting to the standard tool factory.
- Use per-agent tool policy and send-time allow and deny lists.
- Keep connector tools out of the default local tool surface. Let capability resolution add matching connector tools.
- Do not call individual tool implementation modules from `AgentService` or the execution loop.
- Do not bypass `ToolService.beforeCall`, loop detection, approval checks, policy checks, provider-safe name conversion, schema normalization, or execution management.
- Keep read-before-write and filesystem policy behavior inside the tools module.
- Keep cron behavior in cron tools and `CronService`, not host schedulers or ad hoc scheduling.
- Keep script execution behind the centralized script tool and shared file policy checks.

When a tool policy changes, cover both prompt selection and execution gating in tests.

## Script Execution

Script execution must be implemented as a local tool, not as arbitrary shell command execution in the agent loop.

The script tool must:

- Run existing script files only.
- Accept arguments as an array of strings.
- Avoid shell interpolation for script arguments.
- Support only the approved interpreter set.
- Infer the interpreter only from trusted script metadata or recognized script type.
- Respect read-only filesystem policy.
- Use the shared path policy helper for workspace and outside-workspace decisions.
- Use file policy checks for script read access and working-directory write access.
- Use the same approval pipeline as other tools when a path crosses a restricted boundary.
- Bound runtime with a timeout.
- Bound output size and report truncation.
- Return structured text results that include exit code, signal, stdout, stderr, timeout, and truncation state.

Do not add a separate command runner to `AgentService`, the execution loop, or provider adapters. If broader shell support is requested, extend the tools module with the same policy, approval, timeout, and output constraints.

## Capability Resolution

`AgentCapabilityService` augments selected local tools with connector tools and skill instructions.

Keep these constraints:

- Resolve connector tools only when tools are needed or bootstrap is pending.
- Mark connector tools with connector service metadata.
- Match connector tools by prompt against tool name and description.
- Search skills through the skills service.
- Load selected skill instructions through the skills service.
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

Keep routing behavior in the routing module:

- Match configured bindings by channel, account, peer, parent peer, and role ids.
- Prefer more specific bindings over general bindings.
- Resolve the default agent id through store route settings.
- Build stable session keys with `buildAgentSessionKey`.
- Support main sessions and channel-scoped sessions without mixing histories.

Do not duplicate route matching in channel modules. Channels should normalize inbound messages and call the routing helpers.

## Subagents

Subagent behavior belongs in the subagents module.

Preserve these constraints:

- Spawn input must be validated and bounded.
- Only run mode and isolated context are currently supported.
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

Agent runs produce events for UI and channel consumers. Keep event payloads stable and typed through shared event contracts.

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

Use dependencies through existing constructors and service ports:

- `StoreService` for provider, model, agent, operator, routing, and connector configuration.
- `WorkspaceService` for workspace roots and startup context files.
- `PolicyService` for policy and safety decisions.
- `ToolService` for tool creation, filtering, selection, provider preparation, preflight, and execution.
- `CronService` only through cron tools or explicitly injected cron contexts.
- `ConnectorsService` through capability resolution and connector tooling.
- `SkillsService` through capability resolution.
- `TasksService` through subagent task spawning.
- `EventBus` for broadcast and heartbeat events.
- Provider adapters through provider factory and the execution service.

Do not add global singletons or hidden module-level mutable state. Existing default services are acceptable only where the current implementation already uses them as fallback adapters.

## Implementation Rules

When changing the agent module:

- Match the existing TypeScript style and module boundaries.
- Prefer service ports and constructor injection where the module already uses them.
- Keep orchestration in `AgentService`.
- Keep loop mechanics in the execution service and run module.
- Keep prompt assembly in `system-prompt`.
- Keep persistence in the session store.
- Add helper functions locally before introducing a new module.
- Add a new submodule only when there is a durable responsibility, not for a one-off helper.
- Do not introduce decorative design patterns.
- Do not create compatibility shims unless an existing test or public import requires them and the requested change is explicitly about compatibility.
- Remove imports, exports, and modules made unused by your change.
- Keep generated provider, channel, store, renderer, and preload changes out of agent work unless the agent boundary requires them.

## Testing

Add or update focused unit tests for behavior changes.

Cover the relevant behavior:

- `AgentService` orchestration with mocked provider streams and injected dependencies.
- Execution loop behavior with mocked providers and tools.
- System prompt output for deterministic prompt sections.
- Tool selection, policy gating, approval, and tool result events.
- Session save and load, transcript repair, truncation, and index updates.
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
