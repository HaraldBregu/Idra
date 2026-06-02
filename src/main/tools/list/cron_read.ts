import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { checkCronPolicy, cronActor, cronIdSchema, type CronReadArgs, cronService, jsonText } from './utils';

export const cronReadTool: AgentTool<CronReadArgs> = {
	name: 'cron_read',
	description: 'Read a scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_read', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_read: CronService is unavailable.', true);
		try {
			return jsonText(await service.getSchedule(args.id, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_read: ${(err as Error).message}`, true);
		}
	},
};
