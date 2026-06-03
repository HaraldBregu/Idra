import type { AgentTool } from '../core/tool';
import { textResult } from '../core/tool';
import { checkCronPolicy, cronActor, type CronListArgs, cronService } from './utils';
import { jsonText } from '../shared/json-text';

export const cronListTool: AgentTool<CronListArgs> = {
	name: 'cron_list',
	description: 'List scheduled jobs through CronService.',
	schema: {
		type: 'object',
		properties: {
			filter: { type: 'object', additionalProperties: true },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_list', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_list: CronService is unavailable.', true);
		try {
			return jsonText(await service.listSchedules(args.filter ?? {}, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_list: ${(err as Error).message}`, true);
		}
	},
};
