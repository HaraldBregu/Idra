import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import {
	checkCronPolicy,
	cronActor,
	type CronCreateArgs,
	cronCreateSchema,
	cronService,
	jsonText,
} from '../shared/cron-utils';
import type { CronScheduleCreateRequest } from '../../../shared/cron';

export const cronCreateTool: AgentTool<CronCreateArgs> = {
	name: 'cron_create',
	description: 'Create a scheduled job through CronService.',
	schema: cronCreateSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_create', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_create: CronService is unavailable.', true);
		const actor = cronActor(ctx, args);
		const request: CronScheduleCreateRequest = {
			...args,
			source: args.source ?? 'tool',
			sourceId: args.sourceId ?? ctx.sessionId,
			ownerUserId: args.ownerUserId ?? actor.userId,
			sessionId: args.sessionId ?? ctx.sessionId,
			createdBy: args.createdBy ?? ctx.agentId ?? ctx.sessionId,
			timezone: args.timezone ?? actor.timezone,
		};
		try {
			return jsonText(await service.createSchedule(request, actor));
		} catch (err) {
			return textResult(`cron_create: ${(err as Error).message}`, true);
		}
	},
};
