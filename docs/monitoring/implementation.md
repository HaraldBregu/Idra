# Monitoring Implementation

## Goal

Implement runtime monitoring for Friday through one main-process monitoring module. The monitor should capture what happens inside the app while it is running, keep a safe bounded history, and provide a future read API for diagnostics and UI surfaces.

The monitor should answer:

- What happened recently?
- What is running now?
- What failed, crashed, stalled, or was cancelled?
- Which runtime source produced the signal?
- Is the payload safe to display or send to the renderer?

## Scope

Runtime monitoring covers Friday-owned runtime activity:

- main-process lifecycle events
- Electron app, window, renderer, and child-process events
- task lifecycle events
- subagent lifecycle events
- cron and scheduled task activity
- heartbeat and channel activity
- agent run and tool activity when those events are emitted
- runtime health snapshots such as memory, event loop lag, and open windows

It does not inspect arbitrary operating-system processes, system daemons, user shell jobs, launch agents, or external service queues.

## Current Implementation

The first slice is `MonitorService` in `src/main/monitor/service.ts`.

It is intentionally small:

1. `bootstrapServices()` creates and starts `MonitorService`.
2. `MonitorService` subscribes to every typed main-process `EventBus` event in `AppEvents`.
3. Each observed event becomes a `MonitorEventRecord`.
4. Payloads are sanitized before storage.
5. Records are kept in a bounded in-memory array.
6. The service exposes `snapshot`, `list`, and `get`.
7. The service implements `Disposable`, so shutdown removes subscriptions.

Current public model:

```ts
export interface MonitorEventRecord {
	id: string;
	source: 'event-bus';
	eventType: keyof AppEvents;
	category: string;
	severity: 'info' | 'warn' | 'error';
	observedAt: string;
	eventTimestamp: number;
	payload: unknown;
}
```

Current verification:

```bash
yarn typecheck:node
yarn jest --config jest.config.cjs --selectProjects main --runTestsByPath tests/unit/main/monitor/monitor-service.test.ts tests/unit/main/module-imports.test.ts
yarn eslint src/main/monitor/service.ts src/main/monitor/types.ts src/main/monitor/index.ts tests/unit/main/monitor/monitor-service.test.ts
```

## Architecture Direction

Use `MonitorService` as the sink and add small source adapters around runtime systems.

Recommended structure:

```text
src/main/monitor/
  index.ts
  service.ts
  types.ts
  sources/
    event-bus-source.ts
    process-source.ts
    electron-source.ts
    ipc-source.ts
    runtime-snapshot-source.ts
```

Recommended ports:

```ts
export interface MonitorSink {
	record(input: MonitorRecordInput): void;
}

export interface MonitorSource {
	start(): void;
	stop(): void;
}
```

`MonitorService` should own storage, redaction, filtering, and snapshots. Source adapters should only translate runtime signals into monitor records.

## Runtime Sources

### Event Bus Source

Status: implemented inside `MonitorService`.

This source captures typed application events such as:

- task lifecycle events
- subagent lifecycle events
- heartbeat events
- channel route/status events
- window and service events emitted through `EventBus`

Next step: extract this into `sources/event-bus-source.ts` only when adding more sources makes the current service too broad.

### Process Source

Status: planned next.

This source should observe Node process-level runtime failures and lifecycle signals:

- `uncaughtException`
- `unhandledRejection`
- `beforeExit`
- `exit`
- `SIGINT`
- `SIGTERM`
- `SIGHUP`
- `SIGQUIT`

Important behavior:

- Do not replace the existing process safety net in `bootstrap.ts`.
- Record monitor events in addition to crash-log writes.
- Avoid throwing from process handlers.
- Redact error messages and stack traces before monitor storage.

### Electron Source

Status: planned.

This source should observe Electron runtime signals:

- app ready, before-quit, will-quit, quit
- browser-window-created
- browser-window-focus and browser-window-blur
- render-process-gone
- child-process-gone
- certificate-error
- web-contents-created
- webContents did-fail-load
- webContents unresponsive and responsive

Important behavior:

- Keep Electron-specific objects out of stored payloads.
- Store ids, reasons, urls, exit codes, and safe summaries.
- Do not duplicate whole `BrowserWindow` or `WebContents` objects.

### IPC Source

Status: planned.

This source should capture IPC usage at the boundary:

- channel name
- start time
- duration
- success or failure
- sanitized error code and message

Implementation should happen in the IPC gateway/wrapper layer so individual IPC modules do not need bespoke monitoring calls.

### Runtime Snapshot Source

Status: planned.

This source should periodically sample runtime health and active inventory:

- memory usage
- event loop lag
- open window count
- active task count
- queued task count
- running cron job count
- active subagent count
- active browser automation sessions when available
- active realtime transcription sessions when available

This source should produce snapshot records at a conservative interval and should not perform expensive scans on every event.

## Data Handling Rules

### Redaction

Monitor storage must redact before any IPC or renderer exposure.

Redact:

- keys containing `apiKey`, `authorization`, `credential`, `password`, `privateKey`, `secret`, or `token`
- bearer tokens in strings
- private key blocks
- secret-looking key/value text

### Size Limits

Monitor records must be bounded:

- maximum record count in memory
- maximum string length
- maximum object depth
- maximum object keys
- maximum array items

The first slice uses an in-memory cap and truncates nested payloads.

### Persistence

Do not persist monitor records yet.

Persistent monitoring should be a separate decision because it affects:

- privacy
- disk usage
- retention policy
- export and support workflows
- encrypted storage requirements

## Future API

The monitor should eventually expose a narrow trusted renderer API:

```ts
window.monitor.snapshot()
window.monitor.list(filter)
window.monitor.get(id)
window.monitor.onEvent(listener)
```

IPC should return sanitized records only.

## Implementation Phases

### Phase 1: Event Bus Timeline

Status: implemented.

Success criteria:

- monitor service starts during bootstrap
- typed app events are recorded
- payloads are sanitized
- history is bounded
- focused tests pass

### Phase 2: Process Source

Success criteria:

- process exceptions, rejections, exits, and signals are recorded
- existing crash logging remains intact
- process handlers cannot crash the monitor
- tests cover redaction and teardown

### Phase 3: Electron Source

Success criteria:

- renderer crashes and child-process exits are visible in monitor records
- window and webContents lifecycle events are summarized
- Electron object references are not stored

### Phase 4: IPC Source

Success criteria:

- IPC calls have duration and outcome records
- failed IPC calls include sanitized errors
- no individual IPC module needs custom boilerplate

### Phase 5: Runtime Inventory Snapshots

Success criteria:

- monitor can report what is active now, not only what happened recently
- active tasks, subagents, cron jobs, windows, and health samples are visible
- sampling interval is conservative and configurable

### Phase 6: Renderer Monitor UI

Success criteria:

- a trusted UI can inspect sanitized monitor events
- filters by source, category, severity, and time work
- users can distinguish runtime failures from normal lifecycle events

## Testing Strategy

Add focused tests per source:

- event bus source records typed app events
- process source records exceptions and signals without throwing
- Electron source stores safe summaries, not live objects
- IPC source records success/failure duration
- snapshot source reports active inventory without mutation
- monitor service enforces redaction, limits, filtering, and teardown

Use typecheck and focused Jest tests for each phase before broad suite runs.
