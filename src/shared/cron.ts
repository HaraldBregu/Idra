export interface CronTask {
	readonly id: string;
	readonly expression: string;
	readonly message: string;
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
