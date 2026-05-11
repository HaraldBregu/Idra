/**
 * Base shape every cron task payload must satisfy: a string `type`
 * discriminator chosen by the caller at task creation. Concrete data shapes
 * extend this with whatever extra fields they need. New variants are added
 * by declaring them at the call site — no central registry to update.
 */
export interface CronTaskData<TType extends string = string> {
	readonly type: TType;
}

export interface CronTaskAgentData extends CronTaskData<'agent'> {
	readonly prompt: string;
	readonly model?: string;
}

export interface CronTaskAppData extends CronTaskData<'app'> {
	readonly action: string;
	readonly payload?: Record<string, unknown>;
}

export interface CronTaskMessageData extends CronTaskData<'message'> {
	readonly message: string;
}

export interface CronTask<TData extends CronTaskData = CronTaskData> {
	readonly id: string;
	readonly expression: string;
	readonly data: TData;
	readonly timezone?: string;
	readonly createdAt: string;
	readonly lastRun?: string;
}

export interface CronTaskView<TData extends CronTaskData = CronTaskData>
	extends CronTask<TData> {
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

export function isCronTaskData(value: unknown): value is CronTaskData {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { type?: unknown }).type === 'string'
	);
}
