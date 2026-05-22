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

export interface AgentCronContext {
	agentId: string;
	userId?: string;
	sessionId?: string;
	timezone: string;
	permissions: CronActorContext['permissions'];
	confirmed?: boolean;
}

export class AgentCronService {
	private readonly describer = new ScheduleDescriber();

	constructor(private readonly scheduler: CronScheduler) {}

	createScheduleFromAgent(
		request: Omit<
			CronScheduleCreateRequest,
			'source' | 'sourceId' | 'createdBy' | 'timezone' | 'taskType'
		> & {
			timezone?: string;
			taskType?: string;
		},
		agentContext: AgentCronContext
	): Promise<CronSchedule> {
		return this.scheduler.createSchedule(
			{
				...request,
				taskType: request.taskType ?? AGENT_TASK_TYPE,
				source: 'agent',
				sourceId: agentContext.agentId,
				createdBy: agentContext.agentId,
				ownerUserId: request.ownerUserId ?? agentContext.userId,
				sessionId: request.sessionId ?? agentContext.sessionId,
				timezone: request.timezone ?? agentContext.timezone,
				visibility: request.visibility ?? 'user',
			},
			this.actor(agentContext)
		);
	}

	updateScheduleFromAgent(
		scheduleId: CronScheduleId,
		patch: CronScheduleUpdateRequest,
		agentContext: AgentCronContext
	): Promise<CronSchedule> {
		return this.scheduler.updateSchedule(scheduleId, patch, this.actor(agentContext));
	}

	pauseScheduleFromAgent(scheduleId: CronScheduleId, agentContext: AgentCronContext): Promise<void> {
		return this.scheduler.pauseSchedule(scheduleId, this.actor(agentContext));
	}

	resumeScheduleFromAgent(scheduleId: CronScheduleId, agentContext: AgentCronContext): Promise<void> {
		return this.scheduler.resumeSchedule(scheduleId, this.actor(agentContext));
	}

	deleteScheduleFromAgent(scheduleId: CronScheduleId, agentContext: AgentCronContext): Promise<void> {
		return this.scheduler.deleteSchedule(scheduleId, this.actor(agentContext));
	}

	listSchedulesForAgent(
		filter: CronScheduleFilter,
		agentContext: AgentCronContext
	): Promise<CronSchedule[]> {
		return this.scheduler.listSchedules(
			{
				...filter,
				ownerUserId: filter.ownerUserId ?? agentContext.userId,
			},
			this.actor(agentContext)
		);
	}

	async explainSchedule(scheduleId: CronScheduleId, agentContext: AgentCronContext): Promise<string> {
		const schedule = await this.scheduler.getSchedule(scheduleId, this.actor(agentContext));
		return [
			this.describer.describeSchedule(schedule),
			this.describer.describeNextRun(schedule),
			this.describer.describeMissedRunPolicy(schedule),
			this.describer.describeConcurrencyPolicy(schedule),
		].join(' ');
	}

	getNextRunsForAgent(
		scheduleId: CronScheduleId,
		count: number,
		agentContext: AgentCronContext
	): Promise<CronNextRunPreview> {
		return this.scheduler.getNextRuns(scheduleId, count, this.actor(agentContext));
	}

	runScheduleNowFromAgent(scheduleId: CronScheduleId, agentContext: AgentCronContext): Promise<CronScheduledTask> {
		return this.scheduler.runScheduleNow(scheduleId, this.actor(agentContext));
	}

	private actor(context: AgentCronContext): CronActorContext {
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
