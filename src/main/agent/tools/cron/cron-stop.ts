import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { checkCronPolicy, cronActor, cronIdSchema, type CronReadArgs, cronService } from './utils';

export const cronStopTool: AgentTool<CronReadArgs> = {
	name: 'cron_stop',
	description: 'Stop a scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_stop', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_stop: CronService is unavailable.', true);
		try {
			await service.pauseSchedule(args.id, cronActor(ctx));
			return textResult(`stopped cron schedule ${args.id}`);
		} catch (err) {
			return textResult(`cron_stop: ${(err as Error).message}`, true);
		}
	},
};
