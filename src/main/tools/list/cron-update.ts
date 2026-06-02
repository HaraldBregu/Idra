import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { checkCronPolicy, cronActor, type CronUpdateArgs, cronService, jsonText } from './internal/cron-utils';

export const cronUpdateTool: AgentTool<CronUpdateArgs> = {
	name: 'cron_update',
	description: 'Update a scheduled job through CronService.',
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			patch: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'patch'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_update', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_update: CronService is unavailable.', true);
		try {
			return jsonText(await service.updateSchedule(args.id, args.patch, cronActor(ctx, args.patch)));
		} catch (err) {
			return textResult(`cron_update: ${(err as Error).message}`, true);
		}
	},
};
