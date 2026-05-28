# Agent Module Prompt

This module implements a general-purpose personal assistant agent. It is not specialized for any domain. Its role is to understand what the user wants, figure out how to do it, and do it — independently, correctly, and without requiring the user to manage steps manually.

An agent is not just a model. It is the model plus every piece of code, configuration, and execution logic that surrounds it. The model provides probabilistic reasoning; the control layer provides deterministic enforcement. Neither is sufficient alone.

Agent engineering is the discipline that encompasses prompt engineering and context engineering, then goes further: it adds constraint enforcement and iterative refinement. A system that only crafts good prompts or delivers relevant context is still at the mercy of the model's stochastic output. A properly engineered agent governs what the model is allowed to do, validates what it produces, and converges toward a correct state regardless of how the model behaves in any single turn.

Implement and maintain the agent runtime as the deterministic software layer that wraps the probabilistic model. It is UI-independent, model-agnostic, and provider-neutral: the model does not need to know what provider powers it, what transport delivers its tools, or what enforcement layer surrounds it.

This module owns: intent understanding, context shaping, task decomposition, autonomous and background execution, task scheduling, system integration (machine drivers, OS services), deterministic gating, durable state management, bounded self-repair, human-in-the-loop checkpoints, tool lifecycle hooks, intent-driven capability selection, skill loading, MCP integration, parallel subagent coordination, and result middleware. It does not own session persistence, provider streaming, or system prompt assembly — those belong to the agent module.

Use the existing layer model defined in `AGENT_HARNESS_LAYERS`. Do not introduce new layers unless a new durable responsibility emerges. Do not duplicate responsibilities across layers.

## Intent Understanding

The most important thing the agent does before any tool is selected or any task is started is understand what the user actually wants. A user who says "turn off the music" is not asking for a shell command — they are expressing a goal. The agent must map that goal to available capabilities, not expect the user to know what tools exist.

Intent understanding is the first step in every run, before context shaping, before tool selection, and before any action.

**Classify the request type first.** Not every user message is a task to execute. Some are questions, some are preferences, some are instructions to remember, some are requests to schedule something for later. The agent must distinguish:

- **Immediate tasks** — do this now (search, write, send, change a setting).
- **Background tasks** — do this while I continue doing other things (download, monitor, process).
- **Scheduled tasks** — do this later or repeatedly (remind me, run every morning).
- **Questions** — answer this without taking action.
- **Preferences** — remember this about me or adjust behavior going forward.

**Resolve ambiguity before acting.** If the intent is unclear and the action would be hard to reverse (delete, send, configure hardware), ask a clarifying question before proceeding. Keep clarifying questions short and specific — one question at a time. Do not ask for information the agent can infer from context or from prior memory.

**Use memory to avoid redundant questions.** If the user has expressed a preference before, use it. If the agent knows which Bluetooth device the user prefers, do not ask again. Memory-informed intent resolution is what makes the agent feel like it knows the user.

**Map intent to the minimal capable tool set.** Once intent is understood, select only the tools likely needed. A request to "check the weather" does not need filesystem tools. A request to "turn off Bluetooth" does not need web search. Exposing irrelevant tools increases the chance of the model using them incorrectly.

**Never silently reinterpret intent.** If the agent proceeds with an interpretation that differs from what was said, state the interpretation explicitly before acting: "I'll turn off Bluetooth now." This gives the user a chance to correct before any action is taken.

## Three Dimensions of Agent Architecture

Every design decision maps to one of three dimensions. Use these as the primary lens when evaluating what a new feature, gate, or interface belongs to.

**Context** — declarative and procedural knowledge that informs agent decisions. Context includes the task description, relevant memory records, skill instructions, startup files, and project state. The agent shapes context by retrieving only what is necessary, fitting it to the available token budget, and assembling it in a priority order the model can reason from. Good context reduces hallucination; excessive or unstructured context increases it.

**Constraint** — rules that govern agent outputs and prevent problematic patterns. Constraints are enforced deterministically, not through the model's interpretation of instructions. They include tool permission filters, JSON schema validation on tool arguments, safety controller decisions, approval checkpoints, budget ceilings, and policy gates. Constraints are the software analogue of linters and type checkers: they catch structural problems before they propagate.

**Convergence** — iterative refinement processes that drive the run toward a stable, correct state. An agent converges when reapplying it to a given input produces no further changes — this property is called structural idempotence. In practice, convergence means the run loop continues until the model produces no more tool calls, all tool calls pass their gates, all results are recorded, and the session reaches a terminal status. Bounded self-repair belongs here: the agent attempts correction within hard limits, then halts rather than looping indefinitely.

## Design Principle: Start Simple

A single agent with good context engineering consistently outperforms a swarm of specialized agents when the task fits a single context window. Do not add multi-agent orchestration, subagent layers, or complex tool surfaces because the problem seems large — add them only when a concrete bottleneck requires them.

This applies at every scale:

- Prefer one agent with well-shaped context over multiple agents with split context.
- Prefer a small, focused tool surface over a large general one.
- Prefer keyword skill selection over semantic search until keyword matching demonstrably fails.
- Prefer `InMemoryAgentHarnessPersistence` in tests and development over a custom persistence layer.

Complexity in this module becomes technical debt that compounds across every run. Add it deliberately and remove it when it no longer earns its cost.

## Design Principle: Constraint Enforcement

Constraints are the dimension analogous to linters and type checkers in a software build. They are structural checks that run outside the model's control. A constraint is not a prompt instruction the model may or may not follow — it is a gate enforced before, during, or after every model action.

When designing a new constraint, express it as a deterministic check in the layer it belongs to:

- Input constraints (what the model may be asked to do) → `AgentHarnessBoundaryFilter.filterInput` and `AgentHarnessSafetyController.reviewTask`.
- Tool argument constraints (what arguments are structurally valid) → JSON Schema validation in `executeToolCall`.
- Tool execution constraints (which tools are allowed to run) → `AgentHarnessPermissions`, `AgentHarnessSafetyController.reviewToolCall`, and `AgentHarnessApprovalController`.
- Output constraints (what the model may return) → `AgentHarnessBoundaryFilter.filterOutput`.

Do not rely on the system prompt to enforce constraints that must hold unconditionally. Prompt-based constraints are advisory; structural constraints are enforced.

## Design Principle: Enforcement Over Instruction

A prompt that says "run tests after writing code" is guidance. A gate that prevents workflow continuation until deterministic test execution succeeds is enforcement. These are not equivalent.

Separate instruction from enforcement. Behavioral requirements that must hold regardless of model output belong as deterministic gates, not in the system prompt as probabilistic suggestions. When adding a new requirement, decide first whether it is advisory (system prompt) or structural (gate). If it would break correctness or safety when violated, it belongs as a gate.

## Design Principle: Reliability Compounding

Reliability compounds across workflow stages. A multi-step process at 95% per-stage success produces only ~66% end-to-end reliability across eight stages. Making each gate deterministic and each failure mode explicit drives per-stage reliability toward 99%+, which compounds favorably.

Every gate added to `executeToolCall`, every validation step in `resolveTools`, and every bounded retry in self-repair exists to protect end-to-end reliability — not to add ceremony.

## Design Principle: Model Agnosticism

The agent must make no assumptions about the underlying model family, provider, or capability set. All model interaction flows through the `AgentHarnessModel` interface. No provider SDK is called directly.

Consequences:

- Tool schemas are expressed as JSON Schema, not provider-specific formats. The model interface normalizes them.
- Streaming events (`ProviderEvent`) are consumed through the model adapter's `stream` method only.
- Reasoning blocks, tool call formats, and stop reasons are handled by the model adapter before reaching the run loop.
- Model capabilities (context window, cost, tool support) come from `AgentHarnessModelRegistry`, not from hardcoded provider names.
- Fallback candidates in `models.fallbacks` may use entirely different providers. The run loop treats them identically.

Do not add conditionals that branch on provider name, model family, or capability flags. When a capability gap exists, express it through the model descriptor in the registry.

## Scope

This module owns these responsibilities:

- `createAgentHarness` factory and `DefaultAgentHarness` implementation.
- Intent understanding: classifying request type and resolving ambiguity before tool selection.
- Context shaping: retrieving and assembling only the context relevant to the task.
- Tool registry, external tool discovery, and MCP tool provider integration.
- Intent-driven capability selection — local tools, skills, system tools, and remote MCP tools.
- Autonomous multi-step execution without user intervention mid-task.
- Background task execution through detached subagents.
- Task scheduling through `CronService` integration.
- System integration: OS-level tools for network, bluetooth, volume, display, power, and applications.
- Parallel subagent coordination for independent workstreams.
- Deterministic gating: schema validation, safety checks, and approval checkpoints before tool execution.
- Durable state management through the persistence and operation log interfaces.
- Bounded self-repair: retry and fallback behavior with hard iteration and cost ceilings.
- Human-in-the-loop checkpoints at high-risk decision points.
- Pre-tool-use and post-tool-use hook execution.
- Skill discovery, selection, and loading.
- Result optimization through `AgentHarnessToolResultOptimizer`.
- Event emission and operation logging for the full tool lifecycle.
- Budget enforcement for iterations, tokens, cost, and time.
- Procedural integrity: structured, tamper-evident audit trails for governance and compliance.

Do not move provider streaming, session indexing, system prompt construction, or cron scheduling into this module. It integrates with those systems through injected interfaces.

## Run Loop: ReAct Pattern

The run loop implements the ReAct (Reason-Act-Observe) cycle: the model receives the current state, reasons about the next action, executes that action via a tool, observes the result, and repeats until a stopping condition is met.

Each cycle in `runLoop`:

1. **Reason** — call the model via `collectModelTurn`. The model receives the current transcript, system prompt, and available tool schemas. It emits text and zero or more tool calls.
2. **Act** — execute each tool call through `executeToolCall`. Tools read from or write to the world. Results are deterministic: a tool either returns a result or fails with a typed status.
3. **Observe** — append the tool results to the transcript. The model sees exactly what happened — success, error, blocked, or rejected — and uses that to plan the next action.

The loop continues until the model produces no tool calls (convergence), a budget ceiling is hit, or the run is cancelled.

For complex tasks that exceed a single context window, or tasks that can be parallelized, use orchestrator-worker decomposition through subagents:

- The orchestrator breaks the task into subtasks and delegates each to a worker.
- Each worker receives a restricted tool set scoped to its subtask and an isolated context window.
- Workers run in parallel when subtasks are independent. Use `Promise.all` over `runSubagent` calls for parallel dispatch.
- Workers cannot call each other. Results flow back to the orchestrator.
- Overflow in one worker's context window does not affect others.

When to use subagents:

- The task has independent parallel workstreams (research multiple topics simultaneously, process multiple files).
- A subtask needs a different tool set than the parent (a web-search worker should not have filesystem write access).
- A subtask is long-running and should not block the main session (background download, monitoring loop).

When not to use subagents:

- The task is sequential and fits in the current context window.
- The overhead of coordination exceeds the benefit of isolation.

Do not implement orchestration inline in the run loop. Subagent spawning belongs in `runSubagent` and the subagent runtime configured through `AgentHarnessConfig.subagents`.

## Autonomous Operation

The agent works independently. Once a task is understood and confirmed, the user should not need to manage intermediate steps. The agent plans, executes, handles errors, and reports back when done.

Autonomous operation principles:

- **Plan before acting on multi-step tasks.** For tasks that require more than one tool call, produce a plan entry via `AgentHarnessPlanner` before the first action. This gives the run a recoverable shape — if the agent restarts, it knows where it was.
- **Do not ask for permission mid-task unless something unexpected requires it.** If a file is missing or a service is unavailable, try to resolve it before escalating. Only involve the user when the situation requires a decision they need to make.
- **Report progress on long-running tasks.** Emit events as work advances. Do not wait until completion to communicate. For background tasks specifically, persist progress state to the filesystem so the user can query status at any time.
- **Self-correct on errors.** When a tool call fails, use the error information to try an alternative approach before concluding the task cannot be completed. Bounded self-repair applies here: try within the iteration budget, then report the failure with enough detail for the user to act on it.
- **Summarize results, not steps.** When reporting back, tell the user what was accomplished, not every tool call made to accomplish it. Reserve detailed trace information for logs and events.

## Background Execution and Task Scheduling

Many tasks do not need the user to wait. Downloads, long-running processes, monitoring, and periodic actions should run in the background while the user continues with other things.

**Background tasks** run in a detached subagent. The main session returns a reference the user can query for status or cancel. Background subagents:

- Write progress to the filesystem periodically so status can be read without holding the session open.
- Emit events on completion, failure, and significant milestones.
- Are bounded by the same iteration, time, and cost ceilings as foreground runs.
- Can be cancelled by the user at any time through `abortRun`.

**Scheduled tasks** are created through `CronService` via the cron tools. The agent must not schedule work by sleeping inside a tool or the run loop. Scheduling creates a durable cron record that fires independently of the current session.

When a user expresses a scheduling intent ("remind me every morning", "run this at 9am", "check for updates weekly"):

1. Resolve the schedule expression from the natural language description.
2. Create the cron record through the cron tool with the task description and schedule.
3. Confirm the schedule to the user before leaving the session.

Scheduled runs start a new session with the cron task as the initial prompt. They have access to the same tool surface as any other run, constrained by the policy configured for scheduled runs.

Do not implement scheduling logic inside individual tools or the run loop. All scheduling goes through `CronService`.

## System Integration

The agent has access to machine-level capabilities through local system tools. These cover OS services, hardware state, and platform APIs the user would otherwise manage manually.

System tools expose these capabilities:

- **Network** — toggle wifi on/off, list available networks, connect to a network, check connection status.
- **Bluetooth** — toggle on/off, list paired and available devices, connect/disconnect a device, check device battery.
- **Volume and media** — set system volume, mute/unmute, pause/play, skip track, query currently playing.
- **Display** — adjust brightness, toggle dark mode, manage display arrangement.
- **Power** — sleep, restart, shutdown (with approval), query battery status.
- **Notifications** — send a system notification, query do-not-disturb status, toggle focus modes.
- **Clipboard** — read from or write to the system clipboard.
- **Applications** — launch, quit, or switch focus to an application.

System tools that change hardware state or affect other applications must be tagged `destructive: true` or `externalWrite: true` as appropriate, so the approval gate can intercept them when configured to do so.

System tool implementations live in the tools module, not in this module. This module consumes them through the standard tool registry. Do not import platform APIs directly into the run loop.

For unattended or background runs, system tools that require physical confirmation (Bluetooth pairing a new device, shutting down the machine) must require explicit approval even if the general approval gate is disabled.

## Module Names

Use existing file names when extending the implementation:

- `runtime` for the run loop, execute, stream, and subagent logic.
- `tools` for the tool registry, permission filtering, and approval predicates.
- `skills` for the file-backed skill loader.
- `mcp` for the MCP tool provider and server lifecycle.
- `connectors` for the connector registry and connector-backed tools.
- `context` for transcript compaction and context budget management.
- `memory` for in-memory persistence and operation log implementations.
- `events` for the event emitter and async event queue.
- `config` for validation and secret redaction.
- `model` for cost estimation and model descriptor helpers.
- `schema` for JSON schema validation.
- `errors` for typed errors and error shape conversion.
- `types` for all shared interfaces and the layer descriptor table.

Add a new file only when it represents a durable responsibility that does not fit the existing set.

## Memory Architecture

The agent works across three memory layers with fundamentally different properties. Every piece of state produced belongs to exactly one layer.

**Layer 1 — Filesystem (long-term memory)**
Durable state that survives session boundaries: persisted sessions, operation logs, snapshots, and any files produced by tools. This is the primary state mechanism in production agents. The agent can resume from a crash by reading back from the filesystem. No vector databases are required for basic long-term memory — structured files are sufficient and more reliable.

**Layer 2 — RAM (short-term memory)**
Working memory for the current session: the in-memory conversation transcript, loaded skill instructions, and discovered tool lists. Fast but volatile — lost on process exit. The `InMemoryAgentHarnessPersistence` and `InMemoryAgentHarnessOperationLogger` live here. Do not treat RAM as a substitute for filesystem persistence.

**Layer 3 — Context Window (what the model sees)**
The strictest constraint. Everything the model knows about the current task must fit within the context window minus the reserve for output and tool calls. Context window contents are assembled fresh each turn from layers 1 and 2 by `buildContext` and `compactSessionForModel`.

**Memory orchestration cycle for each model turn:**

1. Load relevant state from the filesystem (via `AgentHarnessPersistence` and `AgentHarnessMemory`).
2. Assemble the context window: select, summarize, and budget the loaded state.
3. Run the model turn.
4. Persist produced state to the filesystem before discarding it from RAM.

**Durability invariant**: memory must be flushed to the filesystem before being dropped from the context window or RAM. This is a strict ordering requirement. A crash between step 3 and step 4 must leave the filesystem in a state that allows resumption — not in a state where work was performed but not recorded.

## Context Shaping

Only the information the model needs for the current task should enter the context window. Flooding the model with all available documents or memory entries degrades reasoning quality and wastes context budget.

Context shaping happens in `buildContext` via `AgentHarnessContextManager`:

- Pass the task, session, memory records, and available context budget to the context manager.
- The manager selects, summarizes, or drops context blocks to fit within `budgetTokens`.
- The `AgentHarnessContextAssemblyTrace` records what was included, dropped, and summarized — emit it as `context.assembled` for observability.
- System prompt additions from context are lower-priority than base system prompt and skill instructions.

The `BudgetedAgentHarnessContextManager` is the provided implementation. It fits context into the model's context window minus a reserve for tool calls and output.

Memory records retrieved through `AgentHarnessMemory.retrieve` are the primary source of task-relevant durable facts. They are passed to the context manager as a separate input so the manager can decide how much memory to include based on remaining budget.

Context must be treated as live, not cached at initialization. MCP servers, skill files, and external connectors may change between runs. Load and assemble context fresh on each activation so the agent always reasons from current state — not from a snapshot baked into the system prompt at deploy time. This self-updating property is what separates a properly engineered agent from a static prompt template: the agent fetches current context; a template embeds a past one.

Context engineering strategies for the context manager:

- **Progressive disclosure**: retrieve context in priority order and stop when the budget is consumed. High-priority blocks (task, memory, skill instructions) enter first; lower-priority blocks (startup files, project context) enter only if budget remains.
- **Just-in-time retrieval**: fetch data when it is needed, not at initialization. MCP tools and external context should be discovered per run.
- **Compaction threshold**: when the session transcript consumes more than roughly 90% of the input budget, compact it through `compactSessionForModel` before the next model turn. Do not wait until the transcript overflows.
- **Structured note-taking**: long-running tasks should maintain progress state in the filesystem (via tools), not solely in the transcript. The model can read its own progress notes at the start of each session rather than relying on transcript history.

Do not pass the entire session transcript or all available memory into every model turn. Apply compaction proactively — at the 90% threshold, not at overflow.

## Intent-Driven Capability Selection

Tools are selected based on the inferred intent of the task, not by exposing the full tool surface on every run. A smaller, focused tool surface per run reduces model confusion and improves tool call precision.

Intent classification happens before each run in `resolveTools`:

- Always include local tools that are always-on (no `group` or `enabled: false`).
- Discover external and MCP tools by passing the task to each `AgentHarnessExternalToolProvider.discover`. Providers use the task to self-select relevant tools.
- Load skills through `AgentHarnessSkillLoader.select` before resolving tools. Selected skills may add tools from `AgentHarnessSkill.tools`.
- Apply permission filters last: deny-listed tools are excluded even when intent matches.

When intent cannot be determined (empty task, ambiguous context), fall back to the full permitted tool surface and log a `capability.fallback` operation log entry.

### Tool Priority

When the same capability exists across tool sources, use this priority:

1. **Local tools** — lowest latency, no network, always available. Prefer for filesystem, cron, and application-native operations.
2. **Skill tools** — bundled with skill instructions. Use when the task explicitly requires a skill workflow.
3. **MCP remote tools** — external servers. Use only when the capability is not available locally. Discover per run, not at startup.

Do not register MCP tools in the local tool registry. MCP tools come from `AgentHarnessExternalToolProvider.discover` and must not persist beyond the run.

## Pre-Tool-Use and Post-Tool-Use Hooks

Hooks are the extension point for observability, auditing, compliance logging, and side effects around tool execution. They are observers — they cannot block execution or mutate tool arguments.

The `AgentHarnessHook` interface exposes these lifecycle names:

- `before_run` — fires once before the run loop starts.
- `after_run` — fires once after the run loop completes, including on error.
- `before_model_call` — fires before each model turn.
- `after_model_call` — fires after each model turn.
- `before_tool_call` — fires before each individual tool execution, after all gates have passed.
- `after_tool_call` — fires after each individual tool execution, including on error.

The `before_tool_call` payload must include the tool definition, resolved arguments, run id, and session id. The `after_tool_call` payload must include the tool definition, resolved arguments, result status, content blocks, and duration in milliseconds.

Hook execution rules:

- Hooks run in registration order.
- Hooks must not mutate tool arguments or results. They are observers, not interceptors.
- A hook that throws must not abort the tool call. Catch and log the hook error; continue execution.
- Hooks must complete before the next step begins. They are synchronous in effect even when async in signature.
- Hook timeout is not enforced by default. Callers that need timeout protection should wrap their hook implementation with a guard.

Use hooks for: structured audit trail entries, compliance event emission, external observability sinks, and side-effect triggers. Do not use hooks to block tool execution — use `AgentHarnessSafetyController` for blocking decisions and `AgentHarnessApprovalController` for human-in-the-loop checkpoints.

## Deterministic Gating

Before any tool executes, a deterministic validation sequence runs. Gates run regardless of what the model requested. They cannot be skipped by model output or prompt instructions.

The gate sequence in `executeToolCall`:

1. Look up the tool by name in the resolved tool list.
2. Emit `tool.started`.
3. Run `before_tool_call` hooks (observers only).
4. **Schema validation** — validate arguments against the tool's JSON Schema. Invalid arguments return `status: 'error'` without calling the tool.
5. **Safety gate** — run `AgentHarnessSafetyController.reviewToolCall`. A blocked decision returns `status: 'blocked'` without calling the tool.
6. **Approval checkpoint** — run `AgentHarnessApprovalController.checkpoint` when the tool requires it. A rejected decision returns `status: 'rejected'` without calling the tool.
7. Execute the tool with a per-tool timeout.
8. Run `AgentHarnessToolResultOptimizer.optimize` on the result.
9. Run `after_tool_call` hooks.
10. Emit `tool.finished` with status and duration.

Never bypass this sequence for any tool source. MCP tools, skill tools, and connector tools all enter at step 1 after being included in the resolved tool list.

Statuses returned by gates (`error`, `blocked`, `rejected`) are recorded in the session transcript and visible to the model. They are not silent failures — the model should see what happened and decide how to proceed.

## Feedback Loops

Tools that verify work and feed diagnostics back to the model improve output quality significantly more than tools that only act on the world. Design tools to close the loop: after writing a file, run a linter; after editing code, run affected tests; after calling an external service, validate the response schema.

Feedback tools are ordinary `AgentHarnessTool` implementations. Their design principle is that they return actionable diagnostic output — structured errors, line numbers, failing assertions — that the model can act on in the next iteration. A feedback tool that returns "success" or "failure" with no detail is not useful. A feedback tool that returns the specific line and error message that failed is.

When integrating language-aware feedback (LSP diagnostics, type errors, lint violations):

- Run the diagnostic tool immediately after the relevant write or edit tool call, not at the end of the run.
- Return structured results: file path, line number, severity, and message.
- Do not suppress errors. A blocked or failed result that carries diagnostic information is more useful than a silent success.

The `after_tool_call` hook is the right place to trigger automatic follow-up diagnostics without adding them to every tool implementation. A hook can inspect the tool name and result, and enqueue a diagnostic tool call for the next iteration through the run context.

Do not build feedback loops by adding polling or sleep to tools. Tools must complete synchronously or fail with a timeout. Iterative refinement is the run loop's job — not individual tool logic.

## Bounded Self-Repair

Limited remediation is permitted before escalating or halting. Unbounded retry loops convert model uncertainty into cost and latency without improving outcomes.

The convergence goal is **structural idempotence**: a run that has converged produces the same session state when re-evaluated — the model makes no further tool calls, all gates pass, and the transcript is stable. The run loop drives toward this state and halts when either convergence is reached or a hard ceiling is hit. It never continues past a ceiling hoping for convergence.

Self-repair boundaries:

- **Iterations**: `runtime.maxIterations` caps the total number of model turns per run. Default: 25.
- **Tokens**: `runtime.maxTokens` caps output token production. Exceeding this yields `stopReason: 'max_tokens'`.
- **Cost**: `runtime.maxCostUsd` caps total spend. Exceeded cost yields `stopReason: 'error'`.
- **Time**: `runtime.timeoutMs` caps wall-clock run duration. Exceeded time triggers abort and `stopReason: 'cancelled'`.
- **Tool timeout**: `runtime.toolTimeoutMs` or `tool.timeoutMs` caps individual tool execution time.

Model-level retry and fallback also belong here:

- `models.retry.maxAttempts` caps retries for transient provider errors. Use exponential backoff with `models.retry.baseDelayMs` and `models.retry.maxDelayMs`.
- `models.fallbacks` lists alternate model candidates tried in order when the primary model exhausts retries.
- A run that exhausts all candidates and all retries throws `AgentHarnessError` with `code: 'provider_failed'`.

Do not add ad hoc retry logic outside `collectModelTurn`. All model-level repair behavior belongs there.

## Durable State Management

Persistent records are maintained through `AgentHarnessPersistence` and `AgentHarnessOperationLogger`. These are not conversation history — they are structured workflow state that outlives any single model turn.

**Durability invariant**: state produced during a run must be written to the filesystem before it is discarded from memory. Never drop a tool result, session update, or transcript entry from RAM without first persisting it. A mid-run crash must leave the filesystem in a resumable state — not in a state where work was done but not recorded.

Persistence responsibilities:

- Save and load sessions by id through `persistence.loadSession` and `persistence.saveSession`.
- Create snapshots before destructive operations through `createSnapshot`. Snapshots enable `undo`.
- Save sessions after each tool call batch in the run loop so a crash mid-run does not lose partial progress.
- Save the final session state on run completion, cancellation, and failure.

Operation log responsibilities:

- Append log entries at run start, run finish, run failure, and tool execution.
- Entries must be structured (typed `AgentHarnessOperationLogEntry`) and machine-readable.
- Entries form the tamper-evident audit trail required for governance and compliance.
- Redact secrets from all log entries using `AgentHarnessSecretRedactor` before appending.

Do not use the operation log as a debug console. It is a durable, structured record of what the agent did and why.

## Human-in-the-Loop Design

Human involvement is not manual operation — it is structured approval at high-risk decision points. Humans act as reviewers and exception handlers, not as operators of every step.

The `AgentHarnessApprovalController` is the HITL interface. It receives an `AgentHarnessApprovalRequest` containing the tool name, call id, arguments, and reason for approval. It returns an `AgentHarnessApprovalDecision` with approved/rejected, an optional reason, and optional updated arguments.

Approval is required when:

- `tool.requiresApproval` is `true` or returns `true` from its predicate.
- `tool.destructive` is `true` and `permissions.requireApprovalForDestructiveTools` is not `false`.
- `tool.externalWrite` is `true` and `permissions.requireApprovalForExternalWrites` is not `false`.

When no approval controller is configured, destructive and external-write tools are rejected by default. This is the safe default for unattended deployments.

Emit `approval.requested` before the checkpoint and `approval.resolved` after. These events give observability consumers the ability to track human decisions without querying the approval system directly.

## MCP Integration

MCP provides standardized external data and tool connection protocols. MCP tools are discovered per run, not at startup. Configure MCP through `McpAgentHarnessToolProvider`:

```ts
new McpAgentHarnessToolProvider([
  { name: 'filesystem', transport: 'stdio', command: 'node', args: ['server.js'] },
  { name: 'remote', transport: 'http', url: 'https://example.com/mcp' },
]);
```

The provider connects to servers on first `discover` call, caches the tool list for the run, and disconnects when `close` is called. Emit `mcp.server.connecting`, `mcp.server.connected`, `mcp.inventory`, and `mcp.server.error` events.

MCP tool names are prefixed with the server name: `server__tool_name`. This avoids collisions with local tools and makes the tool source legible in logs.

MCP server failures must degrade gracefully: emit `mcp.server.error` and return an empty tool list for that server. Do not fail the run when one server is unavailable.

## Skills

Skills add structured instructions to the system prompt and optionally contribute tools to the resolved surface. They differ from MCP tools in that they carry procedural knowledge, not just capability.

The `FileAgentHarnessSkillLoader` is the default implementation. It reads skill folders from `rootDir`, each containing a `SKILL.md` file with YAML frontmatter.

Skill selection in `ensureSkills`:

1. Call `skills.list` to get available skill candidates.
2. Call `skills.select` with the task and candidates to get a filtered list of matching skill names.
3. Merge with any `requiredSkills` from the execute input.
4. Apply allow and deny lists from permissions.
5. Load each selected skill once; skip if already loaded.
6. Emit `skill.loaded` for each new skill.

Skill instructions are appended to the system prompt in `buildSystemPrompt`. Skill tools are merged into the resolved tool list.

The default `select` implementation uses keyword matching. Replace it with a semantic matcher when the available skill count grows large enough that keyword matching produces false positives or false negatives.

## Permissions and Safety

Tool access is enforced at two levels, both of which are deterministic:

- **Permissions** (`AgentHarnessPermissions`): static allow and deny lists applied during `resolveTools`. Tools excluded by permissions are never sent to the model. This is a structural exclusion — it happens before the model sees the tool surface.
- **Safety** (`AgentHarnessSafetyController`): dynamic per-call decisions evaluated in `executeToolCall`. A blocked safety decision returns `status: 'blocked'` without executing the tool. The model sees the block and can respond.

These are not advisory — they are structural gates. A model that requests a denied tool receives a blocked result, not a polite refusal in the prompt.

## Procedural Integrity and Audit Trail

A structured, tamper-evident record of every decision made during a run must be produced. This record must be sufficient to demonstrate to an external reviewer that the agent operated within policy boundaries.

The audit trail is assembled from:

- Operation log entries (via `AgentHarnessOperationLogger`) for run lifecycle, tool execution, and failures.
- Session transcript entries for model turns, tool calls, and tool results.
- Event payloads emitted through `AgentHarnessEventSink` for real-time consumers.
- Snapshot records at key workflow transitions.

All audit entries must be structured, typed, and machine-readable. Free-form strings in log entries are not acceptable as the primary record. Use typed fields for event types, statuses, run ids, and tool names.

Secrets are redacted before any entry reaches the log or event sink. The `AgentHarnessSecretRedactor` handles this. Never log raw approval request arguments, tool results containing credentials, or session metadata with sensitive keys.

## Events and Observability

Every significant state change emits a typed `AgentHarnessEvent`. The event union is the public observability contract — do not add fields to existing events without considering consumer impact.

Key tool lifecycle events:

- `tool.discovered` — emitted by each external provider after discovery.
- `tool.started` — emitted at the start of each tool call.
- `tool.finished` — emitted after each tool call with status and duration.
- `tool.error` — emitted when a tool throws an unhandled error.

Operation log entries are separate from events. Use `AgentHarnessOperationLogger` for durable, structured entries that outlive the event stream. Log run starts, completions, failures, and tool execution summaries.

## Configuration

The full agent configuration is `AgentHarnessConfig`. Required fields are `modelId` and `model`. All other fields are optional with safe defaults.

Defaults applied when fields are absent:

- `persistence`: `InMemoryAgentHarnessPersistence`.
- `logs`: `InMemoryAgentHarnessOperationLogger`.
- `secrets`: `DefaultAgentHarnessSecretRedactor`.
- `toolRegistry`: `DefaultAgentHarnessToolRegistry` seeded from `tools`.
- `runtime.maxIterations`: 25.
- `runtime.maxTokens`: 4096.

Validate the configuration in `validateAgentHarnessConfig` before constructing the runtime. Throw `AgentHarnessError` with `code: 'config_invalid'` for missing required fields or incompatible option combinations.

## Public API

Expose the agent through `createAgentHarness`:

```ts
const agent = await createAgentHarness(config);
for await (const event of agent.stream({ task: '...' })) {
  render(event);
}
```

The `execute` method returns `AgentHarnessRunResult` when the run finishes. The `stream` method exposes the same execution as an async iterable of typed events.

Do not expose internal runtime state. Session state is accessible only through `getSession` and `listSessions`. Snapshots are accessible only through `createSnapshot` and `undo`.

## Implementation Rules

When changing this module:

- Match the existing TypeScript style and file boundaries.
- Keep the run loop in `runtime`. Do not move loop mechanics into `tools`, `skills`, or `mcp`.
- Keep context shaping in `buildContext`. Do not scatter context selection across the loop.
- Keep intent classification inside `resolveTools`. Do not scatter tool filtering across the loop.
- Keep deterministic gates in `executeToolCall`. Do not add inline safety or approval checks elsewhere.
- Keep hook execution in `runHooks`. Do not call hooks inline in the middle of other logic.
- Keep all tool sources unified through `executeToolCall`. Do not create separate fast paths for MCP or skill tools.
- Never branch on provider name or model family inside this module.
- Add a new file only when there is a durable responsibility. Local helper functions near the behavior they support are preferred.
- Remove imports, exports, and files made unused by your change.
- Do not introduce decorative abstractions or compatibility shims.

## Testing

Add or update focused unit tests for behavior changes.

Cover the relevant behavior:

- Tool resolution with intent-matching providers that return subsets of tools.
- Context shaping with budget limits: included, dropped, and summarized blocks; compaction at ~90% threshold.
- Progressive disclosure: high-priority context enters first; lower-priority blocks are dropped when budget is exhausted.
- Three-layer memory: filesystem persistence survives crashes; RAM state is rebuilt on resume; context window assembles from both.
- Durability invariant: session state is persisted before being dropped from memory; mid-run crashes leave resumable filesystem state.
- Pre-tool-use and post-tool-use hook execution order, error isolation, and payload shape.
- Feedback loop hooks: a hook that inspects the tool result and the run context to trigger a follow-up diagnostic.
- ReAct cycle: Reason-Act-Observe produces a transcript that the model uses to plan the next action.
- Deterministic gate sequence: schema validation, safety block, and approval rejection — each returns the correct status without executing the tool.
- Permission filtering: allow-list, deny-list, group filter, and destructive approval gate.
- MCP provider connection, tool discovery, server failure degradation, and tool name prefixing.
- Skill selection keyword matching, required skill merging, and permission filtering.
- Skill tool inclusion in the resolved tool surface.
- Result optimizer invocation and content replacement.
- Bounded self-repair: iteration cap, token cap, cost cap, timeout, and model retry/fallback.
- Orchestrator-worker: subagent with restricted tool set and isolated context window.
- Audit log entries at run start, finish, failure, and tool execution.
- Session snapshot creation and undo.
- Event emission order for the full tool call lifecycle.
- Model-agnostic behavior: the same run loop must work against any `AgentHarnessModel` implementation.

Use the narrowest test command that covers the change. If a broader suite has unrelated failures, report those separately.

## Verification Checklist

Before finishing a change to this module, verify:

- The module still compiles for main-process TypeScript.
- No code inside this module imports or references a provider SDK directly.
- `resolveTools` returns only tools appropriate to the task and permissions.
- `before_tool_call` and `after_tool_call` hooks receive correct payloads and a throwing hook does not abort the call.
- Deterministic gates run in order and cannot be bypassed by model input.
- MCP tool names are prefixed and do not collide with local tool names.
- Safety blocks and approval rejections return the correct status without executing the tool.
- All tool sources enter execution through `executeToolCall`.
- State is persisted to the filesystem before being dropped from memory (durability invariant holds).
- Transcript compaction fires before the 90% input budget threshold, not at overflow.
- Audit log entries are structured, typed, and free of unredacted secrets.
- Bounded self-repair ceilings are enforced and produce the correct stop reasons.
- The implementation is not more complex than the task requires.
- New behavior is covered by focused unit tests.
