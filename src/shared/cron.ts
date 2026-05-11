/**
 * Discriminated union for cron task payloads. Each variant carries the
 * data it needs to run when the cron fires. Add a new variant by adding
 * an interface here and extending the CronTaskData union below — the
 * exhaustiveness check in describeCronTaskData will flag missing cases.
 */
export interface CronTaskAgentData {
	readonly type: 'agent';
	readonly prompt: string;
	readonly model?: string;
}

export interface CronTaskAppData {
	readonly type: 'app';
	readonly action: string;
	readonly payload?: Record<string, unknown>;
}

export interface CronTaskMessageData {
	readonly type: 'message';
	readonly message: string;
}

export type CronTaskData =
	| CronTaskAgentData
	| CronTaskAppData
	| CronTaskMessageData;

export type CronTaskDataType = CronTaskData['type'];

export type CronTaskDataOf<T extends CronTaskDataType> = Extract<
	CronTaskData,
	{ type: T }
>;

export interface CronTask {
	readonly id: string;
	readonly expression: string;
	readonly data: CronTaskData;
	readonly timezone?: string;
	readonly createdAt: string;
	readonly lastRun?: string;
}

export interface CronTaskView extends CronTask {
	readonly nextRun?: string;
}

export interface CronJobInfo {
	readonly id: string;
	readonly expression: string;
}

export interface CronTickEvent {
	readonly id: string;
	readonly firedAt: string;
}

/**
 * Returns a human-readable string for a CronTaskData. Used by UI rows and logs.
 * Exhaustive switch — adding a new variant without a case here is a type error.
 */
export function describeCronTaskData(data: CronTaskData): string {
	switch (data.type) {
		case 'agent':
			return data.prompt;
		case 'app':
			return data.action;
		case 'message':
			return data.message;
		default: {
			const _exhaustive: never = data;
			return String(_exhaustive);
		}
	}
}

export function isCronTaskData(value: unknown): value is CronTaskData {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as { type?: unknown };
	if (candidate.type === 'agent') {
		return typeof (value as CronTaskAgentData).prompt === 'string';
	}
	if (candidate.type === 'app') {
		return typeof (value as CronTaskAppData).action === 'string';
	}
	if (candidate.type === 'message') {
		return typeof (value as CronTaskMessageData).message === 'string';
	}
	return false;
}
