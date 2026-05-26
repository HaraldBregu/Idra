import type {
	CronActorContext,
	CronNextRunPreview,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleFilter,
	CronScheduleId,
	CronScheduler,
	CronScheduleUpdateRequest,
} from '../core/cron.types';
import type { CronScheduledTask } from '../../../shared/cron';
import { ScheduleDescriber } from '../core/cron.describer';
import { AGENT_TASK_TYPE } from '../../tasks';

export interface CronServiceContext {
	agentId: string;
	userId?: string;
	sessionId?: string;
	timezone: string;
	permissions: CronActorContext['permissions'];
	confirmed?: boolean;
}

export class CronServiceApi {
	private readonly describer = new ScheduleDescriber();

	constructor(private readonly scheduler: CronScheduler) {}

	createSchedule(
		request: Omit<
			CronScheduleCreateRequest,
			'source' | 'sourceId' | 'createdBy' | 'timezone' | 'taskType'
		> & {
			timezone?: string;
			taskType?: string;
		},
		context: CronServiceContext
	): Promise<CronSchedule> {
		return this.scheduler.createSchedule(
			{
				...request,
				taskType: request.taskType ?? AGENT_TASK_TYPE,
				source: 'agent',
				sourceId: context.agentId,
				createdBy: context.agentId,
				ownerUserId: request.ownerUserId ?? context.userId,
				sessionId: request.sessionId ?? context.sessionId,
				timezone: request.timezone ?? context.timezone,
				visibility: request.visibility ?? 'user',
			},
			this.actor(context)
		);
	}

	updateSchedule(
		scheduleId: CronScheduleId,
		patch: CronScheduleUpdateRequest,
		context: CronServiceContext
	): Promise<CronSchedule> {
		return this.scheduler.updateSchedule(scheduleId, patch, this.actor(context));
	}

	pauseSchedule(
		scheduleId: CronScheduleId,
		context: CronServiceContext
	): Promise<void> {
		return this.scheduler.pauseSchedule(scheduleId, this.actor(context));
	}

	resumeSchedule(
		scheduleId: CronScheduleId,
		context: CronServiceContext
	): Promise<void> {
		return this.scheduler.resumeSchedule(scheduleId, this.actor(context));
	}

	deleteSchedule(
		scheduleId: CronScheduleId,
		context: CronServiceContext
	): Promise<void> {
		return this.scheduler.deleteSchedule(scheduleId, this.actor(context));
	}

	listSchedules(
		filter: CronScheduleFilter,
		context: CronServiceContext
	): Promise<CronSchedule[]> {
		return this.scheduler.listSchedules(
			{
				...filter,
				ownerUserId: filter.ownerUserId ?? context.userId,
			},
			this.actor(context)
		);
	}

	async explainSchedule(
		scheduleId: CronScheduleId,
		context: CronServiceContext
	): Promise<string> {
		const schedule = await this.scheduler.getSchedule(scheduleId, this.actor(context));
		return [
			this.describer.describeSchedule(schedule),
			this.describer.describeNextRun(schedule),
			this.describer.describeMissedRunPolicy(schedule),
			this.describer.describeConcurrencyPolicy(schedule),
		].join(' ');
	}

	getNextRuns(
		scheduleId: CronScheduleId,
		count: number,
		context: CronServiceContext
	): Promise<CronNextRunPreview> {
		return this.scheduler.getNextRuns(scheduleId, count, this.actor(context));
	}

	runNow(
		scheduleId: CronScheduleId,
		context: CronServiceContext
	): Promise<CronScheduledTask> {
		return this.scheduler.runScheduleNow(scheduleId, this.actor(context));
	}

	private actor(context: CronServiceContext): CronActorContext {
		return {
			source: 'agent',
			sourceId: context.agentId,
			userId: context.userId,
			sessionId: context.sessionId,
			timezone: context.timezone,
			permissions: context.permissions,
			confirmed: context.confirmed,
		};
	}
}
