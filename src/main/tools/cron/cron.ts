import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import {
	cronActor,
	type CronCompatArgs,
	cronCreateRequest,
	cronService,
	jsonText,
	requireCronId,
} from './shared/cron-utils';

export const cronTool: AgentTool<CronCompatArgs> = {
	name: 'cron',
	displaySummary: 'Schedule cron jobs, reminders, and wake events.',
	description:
		'Manage scheduled jobs through CronService. Use this only for future, delayed, recurring, reminder, wake, or manual-run scheduling. Do not use this to start immediate in-memory task execution.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['status', 'list', 'get', 'add', 'update', 'remove', 'run', 'runs'],
			},
			jobId: { type: 'string', description: 'Canonical cron job id.' },
			id: { type: 'string', description: 'Compatibility alias for jobId.' },
			includeDisabled: { type: 'boolean' },
			filter: { type: 'object', additionalProperties: true },
			job: { type: 'object', additionalProperties: true },
			patch: { type: 'object', additionalProperties: true },
			name: { type: 'string' },
			description: { type: 'string' },
			enabled: { type: 'boolean' },
			deleteAfterRun: { type: 'boolean' },
			type: {
				type: 'string',
				enum: ['cron', 'interval', 'fixedRate', 'fixedDelay', 'oneTime', 'calendar', 'manual'],
			},
			timezone: { type: 'string' },
			cronExpression: { type: 'string' },
			cron: { type: 'string' },
			expr: { type: 'string' },
			intervalMs: { type: 'number' },
			runAt: { type: 'string' },
			startAt: { type: 'string' },
			endAt: { type: 'string' },
			maxRuns: { type: 'number' },
			taskType: { type: 'string' },
			taskInput: {},
			confirmed: { type: 'boolean' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: (args) => ['add', 'update', 'remove', 'run'].includes(args.action),
	async execute(args, ctx) {
		const service = cronService(ctx);
		if (!service) return textResult('cron: CronService is unavailable.', true);
		try {
			const actor = cronActor(ctx, args);
			if (args.action === 'status') {
				return jsonText({ ok: true, service: 'CronService' });
			}
			if (args.action === 'list') {
				return jsonText(await service.listSchedules(args.filter ?? {}, actor));
			}
			if (args.action === 'get') {
				return jsonText(await service.getSchedule(requireCronId(args), actor));
			}
			if (args.action === 'add') {
				return jsonText(await service.createSchedule(cronCreateRequest(args, ctx), actor));
			}
			if (args.action === 'update') {
				return jsonText(await service.updateSchedule(requireCronId(args), args.patch ?? {}, actor));
			}
			if (args.action === 'remove') {
				await service.deleteSchedule(requireCronId(args), actor);
				return textResult(`removed cron schedule ${requireCronId(args)}`);
			}
			if (args.action === 'run') {
				return jsonText(await service.runScheduleNow(requireCronId(args), actor));
			}
			if (args.action === 'runs') {
				return jsonText(await service.getScheduleExecutions(requireCronId(args)));
			}
			return textResult(`cron: unsupported action ${String(args.action)}`, true);
		} catch (err) {
			return textResult(`cron: ${(err as Error).message}`, true);
		}
	},
};
