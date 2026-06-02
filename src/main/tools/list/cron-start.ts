import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { checkCronPolicy, cronActor, cronIdSchema, type CronReadArgs, cronService } from './internal/cron-utils';

export const cronStartTool: AgentTool<CronReadArgs> = {
	name: 'cron_start',
	description: 'Start a paused scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_start', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_start: CronService is unavailable.', true);
		try {
			await service.resumeSchedule(args.id, cronActor(ctx));
			return textResult(`started cron schedule ${args.id}`);
		} catch (err) {
			return textResult(`cron_start: ${(err as Error).message}`, true);
		}
	},
};
