import type { AgentTool } from '../../base/tool';
import { textResult } from '../../base/tool';
import { checkCronPolicy, cronActor, cronIdSchema, type CronReadArgs, cronService } from './utils';

export const cronDeleteTool: AgentTool<CronReadArgs> = {
	name: 'cron_delete',
	description: 'Delete a scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_delete', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_delete: CronService is unavailable.', true);
		try {
			await service.deleteSchedule(args.id, cronActor(ctx));
			return textResult(`deleted cron schedule ${args.id}`);
		} catch (err) {
			return textResult(`cron_delete: ${(err as Error).message}`, true);
		}
	},
};
