import { CronTool } from '../../core/tool';
import type { Context } from '../../core/tool';
import type {
	Cron,
	CronSchedule,
	CronScheduledTask,
	CronScheduleCreateRequest,
} from '../../core/cron';
import type { JSONSchema } from '../../core/types';

function requireScheduleId(input: Record<string, unknown>, tool: string): string {
	const scheduleId = input.scheduleId;
	if (typeof scheduleId !== 'string' || !scheduleId.trim()) {
		throw new Error(`${tool} requires a non-empty scheduleId.`);
	}
	return scheduleId;
}

const scheduleIdSchema: JSONSchema = {
	type: 'object',
	properties: {
		scheduleId: {
			type: 'string',
			description: 'Identifier of the schedule to act on.',
		},
	},
	required: ['scheduleId'],
	additionalProperties: false,
};

export class CreateScheduleTool extends CronTool {
	readonly name = 'create_schedule';
	readonly description =
		'Create a new cron schedule from a schedule definition request.';
	readonly schema: JSONSchema = {
		type: 'object',
		properties: {
			request: {
				type: 'object',
				description: 'Schedule definition to create.',
				properties: {
					name: { type: 'string' },
					description: { type: 'string' },
					type: { type: 'string' },
					source: { type: 'string' },
					createdBy: { type: 'string' },
					timezone: { type: 'string' },
					cronExpression: { type: 'string' },
					intervalMs: { type: 'number' },
					runAt: { type: 'string' },
					taskType: { type: 'string' },
				},
				required: ['name', 'type', 'source', 'createdBy', 'timezone', 'taskType'],
				additionalProperties: true,
			},
		},
		required: ['request'],
		additionalProperties: false,
	};

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): CronSchedule {
		const request = input.request;
		if (!request || typeof request !== 'object' || Array.isArray(request)) {
			throw new Error('create_schedule requires a request object.');
		}
		return this.cron.createSchedule(request as CronScheduleCreateRequest);
	}
}

export class PauseScheduleTool extends CronTool {
	readonly name = 'pause_schedule';
	readonly description = 'Pause an active cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): void {
		this.cron.pauseSchedule(requireScheduleId(input, 'pause_schedule'));
	}
}

export class ResumeScheduleTool extends CronTool {
	readonly name = 'resume_schedule';
	readonly description = 'Resume a paused cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): void {
		this.cron.resumeSchedule(requireScheduleId(input, 'resume_schedule'));
	}
}

export class DeleteScheduleTool extends CronTool {
	readonly name = 'delete_schedule';
	readonly description = 'Delete a cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): void {
		this.cron.deleteSchedule(requireScheduleId(input, 'delete_schedule'));
	}
}

export class GetScheduleTool extends CronTool {
	readonly name = 'get_schedule';
	readonly description = 'Fetch a single cron schedule by id.';
	readonly schema = scheduleIdSchema;

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): CronSchedule {
		return this.cron.getSchedule(requireScheduleId(input, 'get_schedule'));
	}
}

export class ListSchedulesTool extends CronTool {
	readonly name = 'list_schedules';
	readonly description = 'List cron schedules, optionally filtered.';
	readonly schema: JSONSchema = {
		type: 'object',
		properties: {
			filter: {
				type: 'object',
				description: 'Optional filter to narrow the listed schedules.',
				additionalProperties: true,
			},
		},
		additionalProperties: false,
	};

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): CronSchedule[] {
		const filter = input.filter;
		if (filter !== undefined && (typeof filter !== 'object' || filter === null || Array.isArray(filter))) {
			throw new Error('list_schedules filter must be an object.');
		}
		return this.cron.listSchedules(filter as CronScheduleFilter | undefined);
	}
}

export class RunScheduleNowTool extends CronTool {
	readonly name = 'run_schedule_now';
	readonly description = 'Trigger a cron schedule to run immediately by id.';
	readonly schema = scheduleIdSchema;

	constructor(cron: Cron, context: Context) {
		super(cron, context);
	}

	run(input: Record<string, unknown>): CronScheduledTask {
		return this.cron.runScheduleNow(requireScheduleId(input, 'run_schedule_now'));
	}
}
