import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { checkCronPolicy, cronActor, cronIdSchema, type CronReadArgs, cronService, jsonText } from '../shared/cron-utils';

export const cronRunTool: AgentTool<CronReadArgs> = {
	name: 'cron_run',
	description: 'Run a scheduled job immediately through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_run', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_run: CronService is unavailable.', true);
		try {
			return jsonText(await service.runScheduleNow(args.id, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_run: ${(err as Error).message}`, true);
		}
	},
};
