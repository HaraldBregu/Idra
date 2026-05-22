import { randomUUID } from 'node:crypto';
import {
	isCronTaskData,
	type CronTaskData,
	type FridayCronToolRequest,
	type FridayCronToolResponse,
} from '../../shared/cron';
import { loadExistingSession } from '../session/store';
import type { TranscriptEntry } from '../provider/types';
import type { AgentTool, ToolContext } from './types';
import { textResult } from './types';

function jsonResult(payload: FridayCronToolResponse): ReturnType<typeof textResult> & {
	details: FridayCronToolResponse;
} {
	return {
		status: payload.status,
		content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
		details: payload,
	};
}

function cronActor(ctx: ToolContext) {
	const actor = {
		...(ctx.cronContext ?? { role: 'owner' as const }),
		sessionId: ctx.sessionId,
	};
	const agentId = ctx.cronContext?.agentId ?? ctx.agentId;
	return agentId === undefined ? actor : { ...actor, agentId };
}

function contextMessageCount(args: FridayCronToolRequest): number {
	const count = typeof args.contextMessages === 'number' ? args.contextMessages : 0;
	if (!Number.isFinite(count)) return 0;
	return Math.max(0, Math.min(10, Math.floor(count)));
}

function blockText(entry: TranscriptEntry): string | null {
	if (entry.role === 'user') return entry.content;
	if (entry.role === 'assistant') {
		const text = entry.content
			.map((block) => (block.type === 'text' ? block.text : ''))
			.join('')
			.trim();
		return text || null;
	}
	return null;
}

async function recentContext(
	args: FridayCronToolRequest,
	ctx: ToolContext
): Promise<string | undefined> {
	const count = contextMessageCount(args);
	if (count <= 0) return undefined;
	const session = await loadExistingSession(ctx.sessionId, { baseDir: ctx.sessionBaseDir });
	if (!session) return undefined;
	const lines = session.transcript
		.flatMap((entry) => {
			const text = blockText(entry);
			return text ? [`${entry.role}: ${text.slice(0, 1000)}`] : [];
		})
		.slice(-count);
	const combined = lines.join('\n');
	return combined.length > 4000 ? combined.slice(0, 4000) : combined;
}

function inferredDelivery(ctx: ToolContext): Record<string, unknown> | undefined {
	const source = ctx.deliveryContext;
	if (!source) return undefined;
	const delivery: Record<string, unknown> = { mode: 'announce' };
	for (const key of ['channel', 'to', 'threadId', 'accountId'] as const) {
		if (typeof source[key] === 'string' && source[key].trim()) delivery[key] = source[key];
	}
	return Object.keys(delivery).length > 1 ? delivery : undefined;
}

export const cronTool: AgentTool<FridayCronToolRequest, FridayCronToolResponse> = {
	name: 'cron',
	ownerOnly: true,
	displaySummary: 'Schedule cron jobs, reminders, and wake events.',
	description:
		'Manage scheduled jobs through the Gateway-owned scheduler. Use this only for future, delayed, recurring, reminder, wake, or manual-run scheduling. Do not use this to start immediate in-memory task execution; use the task tool for work that should begin now. Do not emulate scheduling with sleep loops, shell loops, long-running process polling, or model-side timers. For cron schedules, write expressions in the supplied timezone local wall-clock time; do not convert requested local time to UTC first. Use jobId as the canonical id. Prefer isolated agentTurn jobs unless the user asked for main-session systemEvent injection.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['status', 'list', 'get', 'add', 'update', 'remove', 'run', 'runs', 'wake'],
			},
			jobId: { type: 'string', description: 'Canonical cron job id.' },
			id: { type: 'string', description: 'Compatibility alias for jobId.' },
			include: { type: 'string', enum: ['enabled', 'disabled', 'all'] },
			includeDisabled: { type: 'boolean' },
			agentId: { type: 'string' },
			contextMessages: {
				type: 'number',
				description: 'For systemEvent reminders only; capture 1-10 recent messages.',
			},
			timeoutMs: { type: 'number' },
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
			name: { type: 'string' },
			description: { type: 'string' },
			enabled: { type: 'boolean' },
			deleteAfterRun: { type: 'boolean' },
			schedule: { type: 'object', additionalProperties: true },
			sessionTarget: { type: 'string' },
			session: { type: 'string', description: 'Compatibility alias for sessionTarget.' },
			wakeMode: { type: 'string', enum: ['now', 'next-heartbeat'] },
			payload: { type: 'object', additionalProperties: true },
			delivery: { type: 'object', additionalProperties: true },
			failureAlert: { type: 'object', additionalProperties: true },
			at: { type: 'string' },
			atMs: { type: 'number' },
			everyMs: { type: 'number' },
			anchorMs: { type: 'number' },
			cron: { type: 'string', description: 'Cron expression compatibility field.' },
			expr: { type: 'string', description: 'Cron expression.' },
			tz: { type: 'string', description: 'IANA timezone for cron local wall-clock time.' },
			staggerMs: { type: 'number' },
			exact: { type: 'boolean', description: 'When true, normalizes to staggerMs 0.' },
			text: { type: 'string', description: 'systemEvent text or wake text.' },
			message: { type: 'string', description: 'agentTurn message.' },
			fallbacks: { type: 'array', items: { type: 'string' } },
			thinking: { type: 'string', enum: ['low', 'medium', 'high'] },
			timeoutSeconds: { type: 'number' },
			lightContext: { type: 'boolean' },
			allowUnsafeExternalContent: { type: 'boolean' },
			toolsAllow: { type: 'array', items: { type: 'string' } },
			channel: { type: 'string' },
			to: { type: 'string' },
			threadId: { type: 'string' },
			accountId: { type: 'string' },
			bestEffort: { type: 'boolean' },
			bestEffortDeliver: { type: 'boolean' },
			mode: { type: 'string', enum: ['force', 'due', 'now', 'next-heartbeat'] },
			runMode: { type: 'string', enum: ['force', 'due'] },
			force: { type: 'boolean' },
			limit: { type: 'number' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: (args) => ['add', 'update', 'remove', 'run', 'wake'].includes(args.action),
	async execute(args, ctx) {
		const capturedContext = await recentContext(args, ctx);
		const delivery = inferredDelivery(ctx);
		const actor = cronActor(ctx);
		const response =
			capturedContext || delivery
				? await ctx.services.cron.fridayAction(args, actor, {
						recentContext: capturedContext,
						delivery,
					})
				: await ctx.services.cron.fridayAction(args, actor);
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
