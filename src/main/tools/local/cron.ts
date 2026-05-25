import { randomUUID } from 'node:crypto';
import {
	isCronTaskData,
	type CronTaskData,
	type FridayCronToolRequest,
	type FridayCronToolResponse,
} from '../../../shared/cron';
import { loadExistingSession } from '../../session/store';
import type { TranscriptEntry } from '../../provider/types';
import type { AgentTool, ToolContext } from '../core/types';
import { textResult } from '../core/types';

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
	displaySummary: 'Manage scheduled agent jobs.',
	description:
		'Manage scheduled agent work. Use this for reminders, delayed tasks, and recurring jobs after the timing, task, and delivery expectation are clear. Use action=list to review existing jobs, action=get to inspect one job, action=add to create a future or recurring job, and action=remove to delete a job. Do not use this for immediate work, shell sleep loops, system cron, crontab, launchctl, systemctl timers, schtasks, model-side timers, or storing secrets. Ask a focused question before add/remove when the requested schedule or target job is ambiguous. For every-N-minutes requests, prefer schedule.kind=every with everyMs. For wall-clock cron schedules, include an IANA timezone in schedule.tz or tz when it matters. Use jobId as the canonical id.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['list', 'get', 'add', 'remove'],
				description:
					'list: show scheduled jobs. get: inspect one job by id. add: create a scheduled job. remove: delete a scheduled job by id.',
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
			job: {
				type: 'object',
				additionalProperties: true,
				description:
					'Job payload for action=add. Include a clear name, schedule, and payload. Do not include secrets.',
			},
			name: { type: 'string' },
			description: { type: 'string' },
			enabled: { type: 'boolean' },
			deleteAfterRun: { type: 'boolean' },
			schedule: { type: 'object', additionalProperties: true },
			sessionTarget: { type: 'string' },
			session: { type: 'string', description: 'Compatibility alias for sessionTarget.' },
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
			text: { type: 'string', description: 'systemEvent text.' },
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
		},
		required: ['action'],
		additionalProperties: false,
	},
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

