# Heartbeat Module Prompt

Create a heartbeat module that is strictly implemented as a reusable service.

The heartbeat module manages periodic and manual agent check-ins for the application. Any module that needs to schedule heartbeat runs, wake heartbeat from system events, route heartbeat alerts, or read heartbeat status should use this service instead of creating its own heartbeat logic.

Use appropriate design patterns and follow the project's software standards when implementing or refactoring the heartbeat module. Patterns should solve real service-boundary, lifecycle, dependency, scheduling, integration, persistence, or validation problems; do not add decorative abstractions.

The heartbeat module depends on `AgentService`.

## Dependencies

- `AgentService`: check whether target agents or sessions are busy and execute heartbeat agent runs.

The heartbeat module must use the application logger like the other services.

The heartbeat module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the heartbeat module isolated:

- Do not import internal heartbeat files from outside the heartbeat module.
- Do not expose internal heartbeat files directly.
- Only `index` exposes the heartbeat module.
- Consumers must depend on the exported heartbeat service.
- Heartbeat scheduling, wake handling, delivery, and runtime state must stay centralized inside the heartbeat service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep heartbeat-specific implementation types and files inside the heartbeat module unless they are genuinely shared.

When changing the heartbeat service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

## Service Lifecycle

The heartbeat service should:

- Start heartbeat scheduling once and ignore duplicate starts.
- Stop timers, wake handlers, and event subscriptions cleanly.
- Destroy by stopping the service.
- Recompute schedules when heartbeat configuration changes.
- Expose heartbeat status with runtime enabled state, runner activity, configured agent count, next due time, and the last heartbeat event.
- Expose the last heartbeat event.
- Enable or disable runtime heartbeat execution without deleting configuration.
- Read and update default heartbeat timing, including cadence and active hours.
- Store heartbeat records with `agentId` and `modelId` when those values are available, similar to task records.
- Provide a no-op service for disabled or unavailable runtime contexts when the application requires a service-compatible fallback.

## Scheduling And Wake Behavior

The heartbeat service should:

- Resolve heartbeat agents from default agent settings and per-agent heartbeat overrides.
- Use the default heartbeat cadence when no explicit cadence is configured.
- Treat missing, empty, zero, or invalid cadence values as disabled.
- Compute stable phase-aligned schedules per agent so runs are distributed consistently.
- Preserve future due times when schedule identity has not changed.
- Seek the next due time inside configured active hours.
- Respect active hours using the configured timezone, local timezone aliases, and overnight windows.
- Coalesce targeted wake requests and keep the highest-priority wake reason and target override.
- Retry wake requests skipped for retryable busy conditions.
- Defer scheduled, event, and immediate wakes according to not-due, minimum spacing, and flood guard rules.
- Allow manual wakes to bypass ordinary due-time checks.
- Log flood guard deferrals through the application logger.

## Heartbeat Run Behavior

The heartbeat service should:

- Resolve the target agent, heartbeat configuration, delivery target, and session key for each run.
- Support isolated heartbeat sessions when configured.
- Reject unsafe session keys, subagent sessions, and cron-owned sessions.
- Skip when heartbeat runtime is disabled, the agent is disabled, cadence is disabled, active hours exclude the current time, the agent or target session is busy, no agent service is available, delivery is disabled, or file and task gates determine there is nothing to do.
- Read workspace heartbeat context from `HEARTBEAT.md`.
- Skip effectively empty heartbeat context unless the wake source is allowed to bypass file gates.
- Parse heartbeat tasks from the workspace heartbeat context.
- Run only due heartbeat tasks and persist task last-run timestamps after successful runs.
- Queue system events by session key and include eligible exec or cron events in the next heartbeat prompt.
- Consume queued system events after a successful heartbeat run.
- Build heartbeat prompts from the base heartbeat prompt, due tasks, workspace context, queued events, delivery mode, and current time.
- Execute agent runs through `AgentService` with the stored `agentId` and `modelId` when they are available, plus heartbeat-specific options such as model override, timeout, light context, tool-warning suppression, and event suppression.
- Normalize heartbeat replies so `HEARTBEAT_OK` and empty responses become quiet success and actionable text becomes an alert.
- Support structured heartbeat tool responses when they are returned by the runtime.
- Advance the schedule after skipped, successful, and failed runs.

## Delivery Behavior

The heartbeat service should:

- Support no visible delivery target.
- Support delivery to the last known route for the target session.
- Support explicit channel targets through registered channel plugins.
- Resolve account ids and default delivery recipients through channel configuration.
- Respect direct-message blocking policy.
- Resolve heartbeat visibility from channel defaults, channel settings, and account settings.
- Send typing indicators when the target channel supports them and clear typing indicators after the run.
- Deliver alert responses only when alert visibility allows it.
- Deliver `HEARTBEAT_OK` only when OK visibility allows it.
- Use heartbeat indicators when configured.
- Suppress duplicate alert delivery within the duplicate alert window.
- Use deterministic heartbeat idempotency keys for outbound channel delivery.
- Store delivered heartbeat text through heartbeat-owned runtime state so duplicate suppression survives service operations.

## Events

The heartbeat service should:

- Broadcast queued system events when they are accepted.
- Emit and broadcast heartbeat events for skipped, successful, failed, quiet, and alert runs.
- Store the last heartbeat event in memory for status reads.
- Include safe metadata such as status, reason, channel, target, account id, preview, duration, silent state, and indicator type.

## Logging

Use the application's logger for all operational reporting, including lifecycle events, wake handling, schedule changes, skipped runs, flood guard deferrals, delivery decisions, validation failures, persistence failures, and heartbeat run failures. Do not use console logging for module behavior.

The heartbeat service should:

- Log heartbeat run failures through the application logger.
- Log flood guard deferrals through the application logger.
- Do not log secrets, raw provider credentials, or unsafe channel payloads.
- Do not use console logging for module behavior.

## Implementation Requirements

When implementing or changing this module:

- Always implement logging for new or changed operational behavior using the application logger. Do not use console logging for module behavior.
- Respect the declared dependencies. Do not add service dependencies or bypass `AgentService` unless the existing project requirements explicitly require it.
- Use appropriate design patterns when they solve real service-boundary, lifecycle, dependency, scheduling, integration, persistence, or validation problems. Prefer the smallest existing project pattern that fits, and do not add decorative abstractions.
- Follow the project's software standards for code quality, security, reliability, performance, maintainability, logging, error handling, and testing.
- Refactor the owning service directly instead of layering patch-style fixes. Keep public behavior centralized in the service.
- Put types, constants, schemas, channels, or helper files under `src/shared` when they are used across the main process, preload, renderer, or multiple services. Keep module-only files inside the module.
- Implement or update tests for the behavior being changed, including success paths, failure paths, persistence errors, validation, scheduling, wake handling, delivery, events, logger behavior, and `AgentService` interactions.
- Run the focused heartbeat tests after implementation. If shared contracts or call sites changed, also run the narrowest relevant typecheck or integration test.
- Verify the implementation before finishing by confirming the tests pass and the public service behavior matches this prompt.
- Delete files, functions, imports, exports, tests, and local types made unused by the change.

## Testing

Test heartbeat configuration resolution, `heartbeat.json` persistence, stored `agentId` and `modelId`, timing updates, duration parsing, active hours, stable phase scheduling, schedule recomputation, wake coalescing, retryable busy skips, cooldown and flood guards, service lifecycle cleanup, runtime enablement, status reads, system-event queuing, workspace heartbeat context reads, empty context skips, task parsing, task due checks, prompt construction, agent execution through `AgentService`, stored model usage, busy-agent skips, unsafe-session skips, response normalization, delivery routing, visibility resolution, direct-message blocking, duplicate alert suppression, event emission, store-backed runtime state, no-op fallback behavior, and logger behavior for failures.

Tests should call the exported heartbeat service and should not import internal heartbeat files directly unless testing exported helper behavior that is intentionally part of the heartbeat module surface.

Every heartbeat implementation change must include a verification step in the final result that names the test, typecheck, lint, or docs check that was run.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, or extra files unless they are required by the existing project conventions.
