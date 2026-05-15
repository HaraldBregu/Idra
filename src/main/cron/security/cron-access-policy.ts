import type {
	CronActorContext,
	CronSchedule,
	CronScheduleAccessPolicy,
	CronScheduleCreateRequest,
	CronSchedulePermissionLevel,
	CronScheduleUpdateRequest,
} from '../core/cron.types';
import {
	CronPermissionError,
	CronScheduleConfirmationRequiredError,
	CronScheduleFrequencyLimitError,
} from '../core/cron.errors';

const SENSITIVE_TASK_PATTERN =
	/(send|email|post|publish|delete|remove|shell|command|purchase|payment|share|external|calendar|file|connector)/i;

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
		if (input.actor.permissions.includes('adminScheduleManagement')) return;
		if (!input.actor.permissions.includes(input.action)) {
			throw new CronPermissionError(`Missing permission: ${input.action}`, { action: input.action });
		}

		if (input.schedule?.ownerUserId && input.actor.userId && input.schedule.ownerUserId !== input.actor.userId) {
			throw new CronPermissionError('Only the schedule owner can modify this schedule.', {
				scheduleId: input.schedule.id,
			});
		}

		const required = input.schedule?.requiredPermissions ?? [];
		for (const permission of required) {
			if (!input.actor.permissions.includes(permission)) {
				throw new CronPermissionError(`Missing schedule permission: ${permission}`, { permission });
			}
		}
	}

	requiresConfirmation(input: {
		request: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
		existingSchedule?: CronSchedule;
	}): boolean {
		if (input.actor.confirmed || input.request.confirmed) return false;
		const taskType = input.request.taskType ?? input.existingSchedule?.taskType ?? '';
		const requestedPermissions = input.request.requiredPermissions ?? input.existingSchedule?.requiredPermissions ?? [];
		const highFrequency =
			typeof input.request.intervalMs === 'number' &&
			input.request.intervalMs < this.options.highFrequencyThresholdMs;

		return Boolean(
			input.request.requiresConfirmation ||
				highFrequency ||
				SENSITIVE_TASK_PATTERN.test(taskType) ||
				requestedPermissions.some((permission) =>
					[
						'scheduleWritePrivateData',
						'scheduleWriteExternal',
						'scheduleDeleteData',
						'scheduleConnectorAccess',
						'scheduleNetworkAccess',
						'scheduleFileSystemAccess',
					].includes(permission)
				)
		);
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
		if (
			intervalMs < this.options.highFrequencyThresholdMs &&
			!input.actor.permissions.includes('adminScheduleManagement')
		) {
			throw new CronScheduleConfirmationRequiredError(
				'High-frequency schedules require elevated permission or explicit confirmation.',
				{ intervalMs, highFrequencyThresholdMs: this.options.highFrequencyThresholdMs }
			);
		}
	}
}
