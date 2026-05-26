# Agent Module Prompt

Create an agent module that is strictly implemented as a reusable service.

The agent module manages agent execution for the application. Any module that needs to run, coordinate, or interact with agents should use this service instead of creating its own agent logic.

The agent module depends on `ToolService`.

The agent module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the agent module isolated:

- Do not import internal agent files from outside the agent module.
- Do not expose internal agent files directly.
- Only `index` exposes the agent module.
- Consumers must depend on the exported agent service.
- Agent behavior must stay centralized inside the agent service.

Types or files that need to be reused by other processes must be stored under `src/shared` so they can be used everywhere. Keep agent-specific implementation types and files inside the agent module unless they are genuinely shared.

The agent service should:

- Create agent runs.
- Read agent run state.
- Update agent run state.
- Delete agent runs when they are no longer needed.
- List agent runs.
- Execute agents through a reusable service interface.
- Use `ToolService` when an agent needs to call tools.
- Keep agent execution logic out of feature modules.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
