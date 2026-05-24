# Background Activity Monitoring Implementation Plan

## Goal

Give users one place to monitor Friday-managed background activity:

1. background agent tasks
2. subagent runs
3. active and recent task executions
4. scheduled cron jobs and their latest runs

The first implementation should be a monitoring surface, not a new execution system. Existing task, subagent, and cron services should remain the source of truth.

## Assumptions

- "Everything running in background" means work started and owned by Friday, not operating-system processes, launch agents, system cron, or external services.
- Monitoring should include both currently running work and recent completed work when the owning subsystem already exposes history.
- The UI should make lineage clear, especially `cron job -> task` and `parent agent -> subagent task`.
- Runtime control actions should use existing subsystem APIs where they already exist. New actions are out of scope unless they are required for monitoring.

## Current State

Friday already has most of the runtime data needed for this feature:

- `TaskManager` stores in-memory `TaskRecord` objects with `queued`, `running`, `cancelling`, `cancelled`, `succeeded`, and `failed` states.
- `TasksIpc` exposes task start, list, get, cancel, and task lifecycle events to the renderer.
- `SubagentRegistry` tracks child agent lineage, status, timestamps, model/provider overrides, and task ids.
- Subagents run through the task manager as `subagent.run` tasks, so they already have a visible task lifecycle.
- `EventBus` already emits `subagent:created`, `subagent:started`, and `subagent:completed`.
- Friday cron jobs expose persisted job definitions, job state, running status, next run, last run status, and run history.
- Managed cron schedules expose schedule definitions, schedule events, executions, and task ids for triggered background work.
- The renderer already has settings pages for background tasks and cron jobs, but they are separate views and do not show a unified activity model.

## Success Criteria

1. A user can open a single Activity Monitor view and see all Friday-owned background work.
2. Running, queued, cancelling, failed, and recently completed activity updates without a manual refresh.
3. Each item shows source, status, owner, timestamps, and relationship to parent work when available.
4. Subagents are visible even when they were spawned by another agent session.
5. Cron jobs are visible as schedules, and active/recent cron-triggered task runs are visible as executions.
6. Existing task manager and cron behavior remains backward-compatible.
7. No new persistence or migrations are required for the first version.

## Non-Goals

- Do not monitor arbitrary OS processes, shell jobs, system daemons, launchd jobs, Windows Task Scheduler entries, or external service queues.
- Do not replace `TaskManager`, `SubagentRegistry`, or cron stores.
- Do not persist task history in this first pass.
- Do not add a second agent runner or cron runner.
- Do not build broad analytics or metrics collection.

## Proposed Architecture

### Activity Read Model

Add a small shared read model that normalizes existing runtime state for the renderer.

Suggested file:

- `src/shared/background-activity.ts`

Suggested shape:

```ts
export type BackgroundActivityKind =
	| 'task'
	| 'subagent'
	| 'cronJob'
	| 'cronSchedule'
	| 'cronExecution';

export type BackgroundActivityStatus =
	| 'queued'
	| 'running'
	| 'cancelling'
	| 'paused'
	| 'scheduled'
	| 'succeeded'
	| 'failed'
	| 'cancelled'
	| 'disabled'
	| 'completed'
	| 'unknown';

export interface BackgroundActivityItem {
	id: string;
	kind: BackgroundActivityKind;
	title: string;
	status: BackgroundActivityStatus;
	source: 'task' | 'subagent' | 'cron' | 'agent' | 'system';
	createdAt?: string;
	startedAt?: string;
	finishedAt?: string;
	nextRunAt?: string;
	lastRunAt?: string;
	parentId?: string;
	taskId?: string;
	scheduleId?: string;
	agentId?: string;
	sessionId?: string;
	metadata: Record<string, unknown>;
}
```

This should stay intentionally flat. Detailed source records can remain behind existing task and cron detail APIs.

### Main Process Aggregator

Add a read-only aggregator that composes existing services.

Suggested files:

- `src/main/background-activity/index.ts`
- `src/main/background-activity/service.ts`
- `src/main/ipc/background-activity-ipc.ts`

Responsibilities:

1. Read task records from `TaskManager.list()`.
2. Read subagent records from `SubagentRegistry`.
3. Read Friday cron jobs through the cron service.
4. Read managed cron schedules and recent executions through existing cron APIs.
5. Normalize all records into `BackgroundActivityItem`.
6. Join records by existing metadata:
   - `TaskRecord.metadata.subagentRunId`
   - `SubagentRunRecord.taskId`
   - `TaskRecord.metadata.cronScheduleId`
   - `CronExecutionRecord.taskId`
   - Friday cron job state fields such as `runningAtMs`, `nextRunAtMs`, and `lastRunAtMs`

The aggregator should not own storage. It should compute a snapshot from current subsystem state.

### Subagent Visibility

`SubagentRegistry` currently supports listing runs for one requester session. Monitoring needs an owner-level view across sessions.

Add one main-process-only method:

```ts
listSubagentRuns(): SubagentRunRecord[]
```

Keep the existing `subagents` tool scoped to the current requester session. The global list should only be exposed through the trusted renderer IPC surface.

### IPC And Preload API

Add narrow typed IPC methods:

```ts
window.backgroundActivity.snapshot(): Promise<BackgroundActivitySnapshot>
window.backgroundActivity.get(id: string): Promise<BackgroundActivityItem | undefined>
window.backgroundActivity.onEvent(listener): () => void
```

Suggested snapshot:

```ts
export interface BackgroundActivitySnapshot {
	items: BackgroundActivityItem[];
	generatedAt: string;
}
```

Events should be coarse-grained and easy to consume:

```ts
export type BackgroundActivityEvent =
	| { type: 'activity:changed'; item: BackgroundActivityItem }
	| { type: 'activity:removed'; id: string }
	| { type: 'activity:refresh-required' };
```

Use `activity:refresh-required` when a source event does not contain enough data to build a complete item without a fresh snapshot.

### Renderer Experience

Create a unified settings page for background activity.

Suggested route:

- `/settings/activity`

Suggested navigation label:

- `Activity Monitor`

Initial UI:

1. Summary counters for running, queued, failed, scheduled, and disabled items.
2. A filterable list grouped by status or kind.
3. Rows with icon, title, kind, status badge, source, and time fields.
4. A detail page or side panel that links back to existing task and cron detail views where possible.

Keep existing task manager and cron pages in place for now. The activity page can link to them instead of replacing them.

### Controls

The first version should support only controls already backed by existing services:

| Kind | Action | Existing Backend |
| --- | --- | --- |
| Task | Cancel | `TaskManager.cancel()` |
| Subagent | Cancel | cancel underlying `taskId` through `TaskManager.cancel()` |
| Friday cron job | Run now | `cron.action({ action: 'run' })` |
| Friday cron job | Remove | `cron.action({ action: 'remove' })` |
| Managed cron schedule | Pause/resume/delete/run now | existing schedule IPC methods |

Controls can be a second phase if the monitoring view is useful without them.

## Implementation Plan

### Phase 1: Shared Contracts And Main Snapshot

Success criteria:

- `BackgroundActivityItem` and `BackgroundActivitySnapshot` are typed in `src/shared`.
- The main process can produce a unified snapshot from tasks, subagents, and cron.
- No renderer changes are required to test the service.

Implementation:

1. Add `src/shared/background-activity.ts`.
2. Add `SubagentRegistry.listSubagentRuns()`.
3. Add `BackgroundActivityService.snapshot()`.
4. Map task statuses directly from `TaskRecord.status`.
5. Map subagent outcomes to activity statuses.
6. Map Friday cron jobs and managed schedules into scheduled/running/disabled items.
7. Add unit tests for normalization and relationship linking.

Verification:

```bash
yarn test:main tests/unit/main/background-activity
yarn typecheck
```

### Phase 2: IPC And Live Updates

Success criteria:

- Renderer can load a snapshot through preload IPC.
- Task, subagent, and cron lifecycle events update the Activity Monitor without refresh.
- Event payloads are sanitized and do not expose secrets.

Implementation:

1. Add `BackgroundActivityChannels` to `src/shared/ipc-channels`.
2. Add `BackgroundActivityIpc`.
3. Expose `window.backgroundActivity` in preload types and implementation.
4. Bridge task lifecycle events into `activity:changed`.
5. Bridge `subagent:created`, `subagent:started`, and `subagent:completed`.
6. Bridge cron schedule events and Friday cron changes as `activity:refresh-required` if the source event is not enough to build one item.

Verification:

```bash
yarn test:main tests/unit/main/ipc
yarn test:renderer
yarn typecheck
```

### Phase 3: Activity Monitor UI

Success criteria:

- Settings navigation includes Activity Monitor.
- The page shows all background activity in one scannable list.
- Running activity updates live.
- Empty, loading, and error states match existing settings page patterns.

Implementation:

1. Add a settings route for `/settings/activity`.
2. Add a page under `src/renderer/src/pages/settings/pages/activity`.
3. Reuse `SettingsPageShell`, `SettingsSection`, `SettingsPanel`, `Item`, `Badge`, and existing timestamp utilities.
4. Add filters for `All`, `Running`, `Queued`, `Failed`, `Scheduled`, and `Completed`.
5. Link task rows to the existing task details page.
6. Link Friday cron job rows to the existing cron details page.
7. Render subagent rows with parent task/session metadata when available.

Verification:

```bash
yarn test:renderer tests/unit/renderer/pages/settings
yarn typecheck
```

### Phase 4: Optional Controls

Success criteria:

- Users can act on monitored items without learning which subsystem owns them.
- Controls call existing task and cron APIs.
- Unsupported actions are hidden, not disabled without explanation.

Implementation:

1. Add action metadata to `BackgroundActivityItem` or derive it in the renderer.
2. Support task/subagent cancellation.
3. Support cron run now, pause/resume, and remove where existing APIs allow it.
4. Add confirmation for destructive schedule removal.
5. Refresh the snapshot after action completion.

Verification:

```bash
yarn test:main tests/unit/main/background-activity
yarn test:renderer tests/unit/renderer/pages/settings/activity
```

## Data Mapping Notes

### Task Items

Use each `TaskRecord` as a `task` item. Preserve `task.id`, `task.type`, `task.title`, `task.status`, timestamps, progress summary, and sanitized metadata.

If a task has `metadata.subagentRunId`, set `parentId` to the subagent item id.

If a task has `metadata.cronScheduleId`, set `scheduleId` and source to `cron`.

### Subagent Items

Use each `SubagentRunRecord` as a `subagent` item.

Map status as:

| Subagent State | Activity Status |
| --- | --- |
| no `startedAt`, no `outcome` | `queued` |
| `startedAt`, no `outcome` | `running` |
| `outcome: ok` | `succeeded` |
| `outcome: error` | `failed` |
| `outcome: timeout` | `failed` |
| `outcome: cancelled` | `cancelled` |

Set `taskId` from `record.taskId`, `agentId` from `record.agentId`, and `sessionId` from `record.childSessionKey`.

### Cron Items

Use Friday cron jobs as `cronJob` items with:

- `scheduled` when enabled and idle
- `running` when `state.runningAtMs` exists
- `disabled` when disabled
- `failed` only for visible last-run failure badges, not the whole schedule unless the job is disabled due to schedule errors

Use managed schedules as `cronSchedule` items with status mapped from `CronScheduleStatus`.

Use recent cron execution records as `cronExecution` items when they are available, especially when they include `taskId`.

## Open Decisions For Review

1. Should the first UI be a new `Activity Monitor` page, or should the current `Background Tasks` page become the unified monitor?
2. Should completed task history stay limited to current in-memory task records for now, or should task retention be implemented first?
3. Should cron use one unified UI for both Friday cron jobs and managed schedules, or keep them visually distinct?
4. Should the first version include cancellation controls, or only monitoring?
5. How much subagent prompt text should be visible in the monitor before it becomes too noisy or sensitive?

## Recommended First Pull Request

Start with Phase 1 only:

1. shared activity types
2. global subagent registry list
3. main-process snapshot service
4. normalization tests

That gives us a concrete, reviewable data model before touching renderer layout or adding controls.
