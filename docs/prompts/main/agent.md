# Agent Module Prompt

Create an agent module that is strictly implemented as a reusable service.

The agent module manages agent execution for the application. Any module that needs to run, coordinate, or interact with agents should use this service instead of creating its own agent logic.

Use appropriate design patterns and follow the project's software standards when implementing or refactoring the agent module. Patterns should solve real service-boundary, lifecycle, dependency, provider, integration, or validation problems; do not add decorative abstractions.

The agent module depends on `ToolService` for tool execution and policy-aware tool management. It also coordinates with the existing main-process services that are already part of the agent boundary, including store, cron, logger, event bus, workspace, user data directories, policy, tasks, connectors, MCP registry, session storage, provider creation, and subagent spawning.

## Dependencies

- `ToolService`: allow agents to call registered tools.
- `PolicyService`: enforce tool and runtime policy decisions.
- `StoreService`: resolve agent configuration, provider/model settings, routing settings, and subagent settings.
- `WorkspaceService` and user data directory services: resolve workspace-aware context and locate file-backed agent context.
- `TasksService` and subagent services: run and control delegated subagent work.
- Provider factory and session storage helpers: create provider adapters and persist transcript/session state.

The agent module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the agent module isolated:

- Do not import internal agent files from outside the agent module.
- Do not expose internal agent files directly.
- Only `index` exposes the agent module.
- Consumers must depend on the exported agent service.
- Agent behavior must stay centralized inside the agent service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep agent-specific implementation types and files inside the agent module unless they are genuinely shared.

When changing the agent service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

The agent service should:

- Create agent runs.
- Read agent run state.
- Update agent run state.
- Delete agent runs when they are no longer needed.
- List agent runs.
- Execute agents through a reusable service interface.
- Use `ToolService` when an agent needs to call tools.
- Keep agent execution logic out of feature modules.
- Resolve provider, model, reasoning effort, runtime, routing, session key, and startup context through the existing agent services and helpers instead of hardcoding them in callers.
- Evaluate `beforeAgentRun` hooks before execution and preserve safe block metadata when a hook rejects a run.
- Build system prompts through the system-prompt helpers, respecting light-context and heartbeat options.
- Run provider/tool execution through `AgentExecutionService` and the agent harness layer so streaming events, tool-call events, compaction, lifecycle hooks, middleware, session writes, and cancellation stay centralized.
- Use the routing helpers for channel-to-agent route resolution and session-key construction.
- Use the harness registry, selection, runtime activation, and policy helpers for runtime-specific behavior. Do not bypass hook registration, hook firing, or harness policy checks with feature-specific branches.
- Use the subagent service, registry, task handler, and exported tools for child-agent work. Preserve spawn-depth, child-count, sandbox, cancellation, timeout, and metadata behavior.

## Implementation Requirements

When implementing or changing this module:

- Respect the declared dependencies and existing service ports. Do not add new cross-service dependencies, provider construction paths, task runners, or tool execution paths unless the existing project requirements explicitly require it.
- Keep `AgentService` as the orchestration boundary for run lifecycle, provider/model resolution, session loading/saving, run logging, event emission, tool factory setup, hook evaluation, harness execution, and subagent tool wiring.
- Keep `AgentExecutionService` focused on one run execution loop: provider calls, stream events, tool execution through `ToolService`, tool-result middleware, transcript updates, compaction, lifecycle hooks, cancellation, and usage accounting.
- Treat user, soul, heartbeat, and bootstrap files as file-backed agent context that standard tools can update directly. Keep system-prompt assembly centralized in the existing system-prompt helpers, and do not inline prompt-building logic into callers or feature modules.
- Keep routing in `src/main/agent/routing` and use `resolveAgentRoute` and `buildAgentSessionKey` for agent/session selection.
- Keep harness-specific behavior in `src/main/agent/harness`. Register harnesses and hook providers through the registry APIs, and adapt runtime behavior through the existing V2/hook helpers instead of adding parallel plugin systems.
- Keep subagent behavior in `src/main/agent/subagents`. Child runs should go through `SubagentSpawnService`, `SubagentRegistry`, and `SubagentRunTaskHandler`; tools should be exposed through `sessions_spawn` and `subagents` rather than ad hoc service calls.
- Preserve runtime constraints already enforced by the implementation, including maximum tool iterations, tool prompt limits, spawn-depth limits, child-count limits, unsupported subagent modes, and safe metadata handling.
- Use appropriate design patterns when they solve real service-boundary, lifecycle, dependency, provider, integration, or validation problems. Prefer the smallest existing project pattern that fits, and do not add decorative abstractions.
- Follow the project's software standards for code quality, security, reliability, performance, maintainability, logging, error handling, and testing.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put types, constants, schemas, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the module.
- Implement or update tests for the behavior being changed, including failure paths and dependency interactions.
- Verify the implementation with the narrowest relevant typecheck, lint, test, or docs check before finishing.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test agent run creation, state reads, state updates, deletion, listing, execution, cancellation or failure behavior, and tool calls through `ToolService`. Tests should call the exported agent service and should not import internal agent files directly.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
