import type {
	CronActorContext,
	CronSchedule,
	CronScheduleAccessPolicy,
	CronScheduleCreateRequest,
	CronSchedulePermissionLevel,
	CronScheduleUpdateRequest,
} from '../core/cron.types';
import { CronScheduleFrequencyLimitError } from '../core/cron.errors';

export interface DefaultCronScheduleAccessPolicyOptions {
	minIntervalMs: number;
	highFrequencyThresholdMs: number;
	maxActiveSchedulesPerUser: number;
	trustedSystemSources?: string[];
}

export class DefaultCronScheduleAccessPolicy implements CronScheduleAccessPolicy {
	constructor(private readonly options: DefaultCronScheduleAccessPolicyOptions) {}

	async authorize(input: {
		action: CronSchedulePermissionLevel;
		schedule?: CronSchedule;
		request?: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
	}): Promise<void> {
		void input;
	}

	requiresConfirmation(input: {
		request: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
		existingSchedule?: CronSchedule;
	}): boolean {
		void input;
		return false;
	}

	validateFrequency(input: {
		request: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
		existingSchedule?: CronSchedule;
	}): void {
		const intervalMs = input.request.intervalMs ?? input.existingSchedule?.intervalMs;
		if (intervalMs === undefined) return;
		if (intervalMs < this.options.minIntervalMs) {
			throw new CronScheduleFrequencyLimitError(
				`Schedules must run at least ${this.options.minIntervalMs}ms apart.`,
				{ intervalMs, minIntervalMs: this.options.minIntervalMs }
			);
		}
	}
}
