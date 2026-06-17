import { CronData } from '../agent/core/cron-data';
import { Tool } from '../agent/core/tool';
import type {
	CronJsonValue,
	CronScheduleStatus,
	CronScheduleType,
} from '../../shared/app/cron';
import type { CronService } from './service';

function requireString(input: Record<string, unknown>, key: string): string {
	const value = input[key];
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${key} is required and must be a non-empty string.`);
	}
	return value;
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalNumber(input: Record<string, unknown>, key: string): number | undefined {
	const value = input[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Base for cron agent tools. Holds the CronService the tool delegates to;
 * leaves the Tool context at its default since cron tools don't touch files.
 */
abstract class CronTool extends Tool {
	constructor(protected readonly service: CronService) {
		super();
	}
}

class CronCreateScheduleTool extends CronTool {
	readonly name = 'cron_create_schedule';
	readonly description =
		'Create a durable recurring schedule. Provide either a cronExpression (for type "cron") or intervalMs (for type "interval"). The schedule fires the given taskType with taskInput.';
	readonly schema = {
		type: 'object',
		properties: {
			name: { type: 'string', description: 'Human-readable schedule name.' },
			description: { type: 'string', description: 'Optional description.' },
			type: {
				type: 'string',
				enum: ['cron', 'interval', 'oneTime'],
				description: 'Schedule type. Defaults to "cron".',
			},
			cronExpression: {
				type: 'string',
				description: 'Cron expression, e.g. "0 9 * * *". Required when type is "cron".',
			},
			intervalMs: {
				type: 'number',
				description: 'Interval in milliseconds. Required when type is "interval".',
			},
			runAt: {
				type: 'string',
				description: 'ISO timestamp for a one-time run. Required when type is "oneTime".',
			},
			timezone: { type: 'string', description: 'IANA timezone. Defaults to "UTC".' },
			taskType: { type: 'string', description: 'The task type to invoke on each run.' },
			taskInput: {
				type: 'object',
				description: 'Payload passed to the task on each run.',
			},
			enabled: { type: 'boolean', description: 'Whether the schedule starts enabled.' },
		},
		required: ['name', 'taskType'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const type = (optionalString(input, 'type') ?? 'cron') as CronScheduleType;
		const schedule = await this.service.createSchedule({
			name: requireString(input, 'name'),
			description: optionalString(input, 'description'),
			type,
			source: 'agent',
			createdBy: 'agent',
			timezone: optionalString(input, 'timezone') ?? 'UTC',
			cronExpression: optionalString(input, 'cronExpression'),
			intervalMs: optionalNumber(input, 'intervalMs'),
			runAt: optionalString(input, 'runAt'),
			taskType: requireString(input, 'taskType'),
			taskInput: (input.taskInput ?? null) as CronJsonValue,
			enabled: typeof input.enabled === 'boolean' ? input.enabled : undefined,
		});
		return schedule;
	}
}

class CronListSchedulesTool extends CronTool {
	readonly name = 'cron_list_schedules';
	readonly description = 'List durable schedules, optionally filtered by status or task type.';
	readonly schema = {
		type: 'object',
		properties: {
			status: {
				type: 'string',
				enum: ['active', 'paused', 'disabled', 'expired', 'completed', 'failed'],
				description: 'Filter by schedule status.',
			},
			taskType: { type: 'string', description: 'Filter by task type.' },
		},
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const status = optionalString(input, 'status') as CronScheduleStatus | undefined;
		const taskType = optionalString(input, 'taskType');
		return this.service.listSchedules({ status, taskType });
	}
}

class CronGetScheduleTool extends CronTool {
	readonly name = 'cron_get_schedule';
	readonly description = 'Fetch a single durable schedule by id.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		return this.service.getSchedule(requireString(input, 'scheduleId'));
	}
}

class CronPauseScheduleTool extends CronTool {
	readonly name = 'cron_pause_schedule';
	readonly description = 'Pause a durable schedule so it stops firing until resumed.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const scheduleId = requireString(input, 'scheduleId');
		await this.service.pauseSchedule(scheduleId);
		return { scheduleId, status: 'paused' };
	}
}

class CronResumeScheduleTool extends CronTool {
	readonly name = 'cron_resume_schedule';
	readonly description = 'Resume a paused durable schedule.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const scheduleId = requireString(input, 'scheduleId');
		await this.service.resumeSchedule(scheduleId);
		return { scheduleId, status: 'active' };
	}
}

class CronDeleteScheduleTool extends CronTool {
	readonly name = 'cron_delete_schedule';
	readonly description = 'Delete a durable schedule permanently.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const scheduleId = requireString(input, 'scheduleId');
		await this.service.deleteSchedule(scheduleId);
		return { scheduleId, status: 'deleted' };
	}
}

class CronRunScheduleNowTool extends CronTool {
	readonly name = 'cron_run_schedule_now';
	readonly description = 'Trigger a durable schedule to run immediately, off its normal cadence.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		return this.service.runScheduleNow(requireString(input, 'scheduleId'));
	}
}

class CronNextRunsTool extends CronTool {
	readonly name = 'cron_next_runs';
	readonly description = 'Preview the upcoming run times for a durable schedule.';
	readonly schema = {
		type: 'object',
		properties: {
			scheduleId: { type: 'string', description: 'The schedule id.' },
			count: { type: 'number', description: 'How many upcoming runs to return. Defaults to 5.' },
		},
		required: ['scheduleId'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>) {
		const scheduleId = requireString(input, 'scheduleId');
		const count = optionalNumber(input, 'count') ?? 5;
		return this.service.getNextRuns(scheduleId, count);
	}
}

/**
 * CronData implementation backed by the CronService. Exposes the durable
 * schedule management surface to the agent as tools.
 */
export class CronServiceData extends CronData {
	constructor(private readonly service: CronService) {
		super();
	}

	tools(): Tool[] {
		return [
			new CronCreateScheduleTool(this.service),
			new CronListSchedulesTool(this.service),
			new CronGetScheduleTool(this.service),
			new CronPauseScheduleTool(this.service),
			new CronResumeScheduleTool(this.service),
			new CronDeleteScheduleTool(this.service),
			new CronRunScheduleNowTool(this.service),
			new CronNextRunsTool(this.service),
		];
	}
}
