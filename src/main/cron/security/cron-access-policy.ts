import type {
	CronActorContext,
	CronSchedule,
	CronScheduleAccessPolicy,
	CronScheduleCreateRequest,
	CronSchedulePermissionLevel,
	CronScheduleUpdateRequest,
} from '../core/cron.types';
import { CronPermissionError, CronScheduleFrequencyLimitError } from '../core/cron.errors';

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
		const { action, schedule, request, actor } = input;
		if (this.hasPermission(actor, 'adminScheduleManagement')) return;
		this.assertPermission(actor, action);
		this.assertActorHasOwner(action, actor, request, schedule);
		this.assertScheduleOwner(actor, schedule);
		this.assertRequiredPermissions(actor, request?.requiredPermissions ?? schedule?.requiredPermissions);
	}

	requiresConfirmation(input: {
		request: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
		existingSchedule?: CronSchedule;
	}): boolean {
		const requiresConfirmation =
			input.request.requiresConfirmation ?? input.existingSchedule?.requiresConfirmation ?? false;
		return requiresConfirmation && input.request.confirmed !== true && input.actor.confirmed !== true;
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

	private hasPermission(
		actor: CronActorContext,
		permission: CronSchedulePermissionLevel
	): boolean {
		return (
			actor.permissions.includes('adminScheduleManagement') ||
			actor.permissions.includes(permission)
		);
	}

	private assertPermission(
		actor: CronActorContext,
		permission: CronSchedulePermissionLevel
	): void {
		if (this.hasPermission(actor, permission)) return;
		throw new CronPermissionError(`Missing cron permission: ${permission}`, {
			action: permission,
			source: actor.source,
			userId: actor.userId ?? null,
		});
	}

	private assertActorHasOwner(
		action: CronSchedulePermissionLevel,
		actor: CronActorContext,
		request?: CronScheduleCreateRequest | CronScheduleUpdateRequest,
		schedule?: CronSchedule
	): void {
		if ((action === 'createSchedule' || (action === 'listSchedules' && !schedule)) && !actor.userId) {
			throw new CronPermissionError('Cron schedule owner is required.', {
				action,
				source: actor.source,
				userId: null,
			});
		}
		if (!request || !('ownerUserId' in request)) return;
		const requestedOwner = request.ownerUserId;
		if (!actor.userId) {
			throw new CronPermissionError('Cron schedule owner is required.', {
				source: actor.source,
				ownerUserId: requestedOwner ?? null,
			});
		}
		if (requestedOwner && requestedOwner !== actor.userId) {
			throw new CronPermissionError('Cron schedule owner does not match the actor.', {
				source: actor.source,
				actorUserId: actor.userId,
				ownerUserId: requestedOwner,
			});
		}
	}

	private assertScheduleOwner(actor: CronActorContext, schedule?: CronSchedule): void {
		if (!schedule?.ownerUserId) return;
		if (!actor.userId || actor.userId !== schedule.ownerUserId) {
			throw new CronPermissionError('Cron schedule is owned by another user.', {
				source: actor.source,
				actorUserId: actor.userId ?? null,
				ownerUserId: schedule.ownerUserId,
				scheduleId: schedule.id,
			});
		}
	}

	private assertRequiredPermissions(
		actor: CronActorContext,
		requiredPermissions?: readonly CronSchedulePermissionLevel[]
	): void {
		for (const permission of requiredPermissions ?? []) {
			this.assertPermission(actor, permission);
		}
	}
}
