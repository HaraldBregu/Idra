import { randomUUID } from 'node:crypto';
import {
	isCronTaskData,
	type CronTaskData,
	type OpenClawCronToolRequest,
	type OpenClawCronToolResponse,
} from '../../shared/cron';
import type { AgentTool, ToolContext } from './types';
import { textResult } from './types';

function jsonResult(payload: OpenClawCronToolResponse): ReturnType<typeof textResult> & {
	details: OpenClawCronToolResponse;
} {
	return {
		status: payload.status,
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

function cronActor(ctx: ToolContext) {
	return ctx.cronContext ?? {
		role: 'owner' as const,
		sessionId: ctx.sessionId,
	};
}

export const cronTool: AgentTool<OpenClawCronToolRequest, OpenClawCronToolResponse> = {
	name: 'cron',
	description:
		'Manage Gateway-owned scheduled automation. Use for reminders, delayed follow-ups, recurring reports, and background chores. Do not emulate scheduling with sleep loops, shell loops, or process polling. Prefer isolated agentTurn jobs unless the user asked for main-session event injection or current-session binding.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['status', 'list', 'get', 'add', 'update', 'remove', 'run', 'runs', 'wake'],
			},
			jobId: { type: 'string', description: 'Canonical cron job id.' },
			include: { type: 'string', enum: ['enabled', 'disabled', 'all'] },
			job: {
				type: 'object',
				additionalProperties: true,
				description: 'Job payload for action=add.',
			},
			patch: {
				type: 'object',
				additionalProperties: true,
				description: 'Patch payload for action=update.',
			},
			mode: { type: 'string', enum: ['force', 'due'] },
			force: { type: 'boolean' },
			limit: { type: 'number' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: (args) => ['add', 'update', 'remove', 'run', 'wake'].includes(args.action),
	async execute(args, ctx) {
		const response = await ctx.services.cron.openClawAction(args, cronActor(ctx));
		return jsonResult(response);
	},
};

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
