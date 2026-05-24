# Monitoring

This folder documents Friday's monitoring module and the runtime monitoring implementation path.

The monitoring module is separate from user-facing background activity views. It captures runtime events and health signals from the main process so the app can later expose diagnostics, activity history, crash context, and live runtime state through IPC and the renderer.

## Pages

- [Monitoring implementation](implementation.md): module goals, current implementation, runtime source strategy, data handling, and rollout phases.

## Current Status

The first runtime slice is implemented in `src/main/monitor`.

It currently:

- Starts as a main-process service during bootstrap.
- Subscribes to all typed `EventBus` events in `AppEvents`.
- Stores a bounded in-memory event timeline.
- Redacts secret-looking payload fields and values.
- Exposes `snapshot`, `list`, and `get` methods for future IPC/UI use.
- Disposes its event subscriptions during service-container shutdown.

## Source Landmarks

- `src/main/monitor/index.ts`
- `src/main/monitor/service.ts`
- `src/main/monitor/types.ts`
- `src/main/bootstrap.ts`
- `src/main/service-registry.ts`
- `tests/unit/main/monitor/monitor-service.test.ts`

## Related Docs

- [Background activity monitoring implementation plan](../background-activity-monitoring-implementation-plan.md)
