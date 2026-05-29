import type { HeartbeatStoreState } from '../../shared/heartbeat';

const DUPLICATE_ALERT_WINDOW_MS = 24 * 60 * 60_000;

export interface HeartbeatStateStorage {
	getHeartbeatState(): HeartbeatStoreState;
	setHeartbeatState(state: HeartbeatStoreState): void;
}

export class HeartbeatRuntimeState {
	constructor(private readonly storage: HeartbeatStateStorage) {}

	getTaskLastRunMs(agentId: string, sessionKey: string, taskName: string): number | undefined {
		return this.storage.getHeartbeatState().taskState[
			heartbeatTaskStateKey(agentId, sessionKey, taskName)
		]?.lastRunMs;
	}

	markTasksRun(
		agentId: string,
		sessionKey: string,
		tasks: ReadonlyArray<{ name: string }>,
		nowMs: number
	): void {
		if (tasks.length === 0) return;
		const current = this.storage.getHeartbeatState();
		const taskState = { ...current.taskState };
		for (const task of tasks) {
			taskState[heartbeatTaskStateKey(agentId, sessionKey, task.name)] = { lastRunMs: nowMs };
		}
		this.storage.setHeartbeatState({ ...current, taskState });
	}

	recordDeliveredText(sessionKey: string, text: string, atMs: number): void {
		const current = this.storage.getHeartbeatState();
		this.storage.setHeartbeatState({
			...current,
			lastDelivered: {
				...current.lastDelivered,
				[sessionKey]: { text, atMs },
			},
		});
	}

	isDuplicateAlert(sessionKey: string, text: string, nowMs: number): boolean {
		const previous = this.storage.getHeartbeatState().lastDelivered[sessionKey];
		return Boolean(
			previous && previous.text === text && nowMs - previous.atMs < DUPLICATE_ALERT_WINDOW_MS
		);
	}
}

export function heartbeatTaskStateKey(agentId: string, sessionKey: string, taskName: string): string {
	return `${agentId}:${sessionKey}:${taskName}`;
}
