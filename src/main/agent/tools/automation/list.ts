import { listSchedules } from '../../cron';
import { BaseTool, type Context } from '../../types';

export class ListSchedulesTool extends BaseTool {
	readonly name = 'list_schedules';
	readonly description = 'List all cron schedules.';
	readonly schema = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	run() {
		return listSchedules();
	}
}
