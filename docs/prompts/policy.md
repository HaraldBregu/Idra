# Policy Module Prompt

Create a policy module that is strictly implemented as a reusable service.

The policy module manages policy logic for the application. Any module that needs to evaluate, apply, or enforce policies should use this service instead of creating its own policy logic.

The policy module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the policy module isolated:

- Do not import internal policy files from outside the policy module.
- Do not expose internal policy files directly.
- Only `index` exposes the policy module.
- Consumers must depend on the exported policy service.
- Policy behavior must stay centralized inside the policy service.

Types that need to be reused by other processes can be stored in a shared folder. Keep policy-specific implementation types inside the policy module unless they are genuinely shared.

The policy service should:

- Register policy rules.
- Evaluate policies through a reusable interface.
- Keep policy logic out of feature modules.
- Provide consistent policy decisions across the application.
- Report policy evaluation errors through the application's logging or reporting system.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
