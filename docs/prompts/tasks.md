# Tasks Module Prompt

Create a tasks module that is strictly implemented as a reusable service.

The tasks module manages background tasks that run in the background. Tasks are stored in memory using RAM, not persisted storage.

The tasks module can run agents as part of task execution.

The tasks module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the tasks module isolated:

- Do not import internal task files from outside the tasks module.
- Do not expose internal task files directly.
- Only `index` exposes the tasks module.
- Consumers must depend on the exported tasks service.
- Task behavior must stay centralized inside the tasks service.

Types or files that need to be reused by other processes must be stored under `src/shared` so they can be used everywhere. Keep task-specific implementation types and files inside the tasks module unless they are genuinely shared.

The tasks service should:

- Create background tasks.
- Read background task state.
- Update background task state.
- Delete background tasks from memory.
- List background tasks.
- Run tasks in the background.
- Run agents when a task requires agent execution.
- Store active task state in RAM.

Each task should have one dependency. Do not add multiple task dependencies unless the existing project requirements explicitly require it.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
