import { CronTool, type Context } from '../../types';
import {
	createSchedule,
	deleteSchedule,
	getSchedule,
	listSchedules,
	pauseSchedule,
	resumeSchedule,
	runScheduleNow,
	updateSchedule,
	type CronFunctionId,
	type CronSchedule,
	type CronScheduledTask,
	type CronScheduleCreateRequest,
	type CronScheduleUpdateRequest,
} from '../../cron';
import type { JSONSchema } from '../../types';

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
	readonly name: CronFunctionId = 'create_schedule';
	readonly description: string =
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
					cronExpression: { type: 'string' },
					enabled: { type: 'boolean' },
					action: {
						type: 'object',
						description: 'Action to run when the schedule fires.',
						oneOf: [
							{
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['debug'] },
									message: { type: 'string' },
								},
								required: ['type', 'message'],
								additionalProperties: false,
							},
							{
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['agent'] },
									prompt: { type: 'string' },
									effort: {
										type: 'string',
										enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
									},
								},
								required: ['type', 'prompt', 'effort'],
								additionalProperties: false,
							},
						],
					},
				},
				required: ['name', 'action'],
				additionalProperties: false,
			},
		},
		required: ['request'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): CronSchedule {
		const request = input.request;
		if (!request || typeof request !== 'object' || Array.isArray(request)) {
			throw new Error('create_schedule requires a request object.');
		}
		return createSchedule(request as CronScheduleCreateRequest);
	}
}

export class PauseScheduleTool extends CronTool {
	readonly name: CronFunctionId = 'pause_schedule';
	readonly description: string = 'Pause an active cron schedule by id.';
	readonly schema: JSONSchema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): void {
		pauseSchedule(requireScheduleId(input, 'pause_schedule'));
	}
}

export class UpdateScheduleTool extends CronTool {
	readonly name: CronFunctionId = 'update_schedule';
	readonly description: string = 'Update an existing cron schedule by id.';
	readonly schema: JSONSchema = {
		type: 'object',
		properties: {
			scheduleId: {
				type: 'string',
				description: 'Identifier of the schedule to update.',
			},
			request: {
				type: 'object',
				description: 'Fields to update on the schedule.',
				properties: {
					name: { type: 'string' },
					description: { type: 'string' },
					cronExpression: { type: 'string' },
					enabled: { type: 'boolean' },
					action: {
						type: 'object',
						description: 'Action to run when the schedule fires.',
						oneOf: [
							{
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['debug'] },
									message: { type: 'string' },
								},
								required: ['type', 'message'],
								additionalProperties: false,
							},
							{
								type: 'object',
								properties: {
									type: { type: 'string', enum: ['agent'] },
									prompt: { type: 'string' },
									effort: {
										type: 'string',
										enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
									},
								},
								required: ['type', 'prompt', 'effort'],
								additionalProperties: false,
							},
						],
					},
				},
				additionalProperties: false,
			},
		},
		required: ['scheduleId', 'request'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): CronSchedule {
		const request = input.request;
		if (!request || typeof request !== 'object' || Array.isArray(request)) {
			throw new Error('update_schedule requires a request object.');
		}
		if (Object.keys(request).length === 0) {
			throw new Error('update_schedule requires at least one field in request.');
		}
		return updateSchedule(
			requireScheduleId(input, 'update_schedule'),
			request as CronScheduleUpdateRequest
		);
	}
}

export class ResumeScheduleTool extends CronTool {
	readonly name: CronFunctionId = 'resume_schedule';
	readonly description: string = 'Resume a paused cron schedule by id.';
	readonly schema: JSONSchema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): void {
		resumeSchedule(requireScheduleId(input, 'resume_schedule'));
	}
}

export class DeleteScheduleTool extends CronTool {
	readonly name: CronFunctionId = 'delete_schedule';
	readonly description: string = 'Delete a cron schedule by id.';
	readonly schema: JSONSchema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): void {
		deleteSchedule(requireScheduleId(input, 'delete_schedule'));
	}
}

export class GetScheduleTool extends CronTool {
	readonly name: CronFunctionId = 'get_schedule';
	readonly description: string = 'Fetch a single cron schedule by id.';
	readonly schema: JSONSchema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): CronSchedule {
		return getSchedule(requireScheduleId(input, 'get_schedule'));
	}
}

export class ListSchedulesTool extends CronTool {
	readonly name: CronFunctionId = 'list_schedules';
	readonly description: string = 'List all cron schedules.';
	readonly schema: JSONSchema = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	run(): CronSchedule[] {
		return listSchedules();
	}
}

export class RunScheduleNowTool extends CronTool {
	readonly name: CronFunctionId = 'run_schedule_now';
	readonly description: string = 'Trigger a cron schedule to run immediately by id.';
	readonly schema: JSONSchema = scheduleIdSchema;

	constructor(context: Context) {
		super(context);
	}

	run(input: Record<string, unknown>): CronScheduledTask {
		return runScheduleNow(requireScheduleId(input, 'run_schedule_now'));
	}
}
