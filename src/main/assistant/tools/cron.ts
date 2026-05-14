import { randomUUID } from 'node:crypto';
import { isCronTaskData, type CronTaskData } from '../../../shared/cron';
import type { AgentTool } from './types';
import { textResult } from './types';

interface CronAddArgs {
	expression: string;
	data: unknown;
	id?: string;
	timezone?: string;
}

export const cronAddTool: AgentTool<CronAddArgs> = {
	name: 'cron_add',
	description: "Schedule a recurring job using a cron expression (e.g. '0 9 * * *').",
	schema: {
		type: 'object',
		properties: {
			expression: { type: 'string', description: "Cron expression, e.g. '0 9 * * *'." },
			data: {
				type: 'object',
				description: "Task payload. Must include a string 'type' discriminator.",
				properties: { type: { type: 'string' } },
				required: ['type'],
				additionalProperties: true,
			},
			id: { type: 'string' },
			timezone: { type: 'string' },
		},
		required: ['expression', 'data'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		if (!isCronTaskData(args.data)) {
			return textResult("cron_add: 'data' must be an object with a string 'type' field", true);
		}
		const typed = args.data as CronTaskData;
		const id = args.id ? String(args.id) : randomUUID();
		ctx.services.cron.schedule(id, args.expression, typed, () => {}, {
			timezone: args.timezone,
		});
		return textResult(`Scheduled job ${id}: '${args.expression}' — [${typed.type}]`);
	},
};

export const cronListTool: AgentTool = {
	name: 'cron_list',
	description: 'List all scheduled cron jobs.',
	schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
	async execute(_args, ctx) {
		const jobs = ctx.services.cron.listJobs();
		if (jobs.length === 0) return textResult('No jobs scheduled.');
		return textResult(jobs.map((j) => `[${j.id}] '${j.expression}'`).join('\n'));
	},
};

interface CronRemoveArgs {
	job_id: string;
}

export const cronRemoveTool: AgentTool<CronRemoveArgs> = {
	name: 'cron_remove',
	description: 'Remove a scheduled cron job by ID.',
	schema: {
		type: 'object',
		properties: { job_id: { type: 'string' } },
		required: ['job_id'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const id = String(args.job_id ?? '');
		if (!ctx.services.cron.has(id)) return textResult(`No job found with ID ${id}.`, true);
		ctx.services.cron.unschedule(id);
		return textResult(`Removed job ${id}.`);
	},
};
