import { CronData } from '../agent/core/cron-data';
import type { Tool } from '../agent/core/tool';
import type { CronService } from './service';
import {
	CronCreateScheduleTool,
	CronDeleteScheduleTool,
	CronGetScheduleTool,
	CronListSchedulesTool,
	CronNextRunsTool,
	CronPauseScheduleTool,
	CronResumeScheduleTool,
	CronRunScheduleNowTool,
} from './tools';

/**
 * CronData implementation backed by the CronService. Exposes the durable
 * schedule management surface to the agent as tools.
 */
export class CronServiceData extends CronData {
	constructor(private readonly service: CronService) {
		super();
	}

	tools(): Tool[] {
		return [
			new CronCreateScheduleTool(this.service),
			new CronListSchedulesTool(this.service),
			new CronGetScheduleTool(this.service),
			new CronPauseScheduleTool(this.service),
			new CronResumeScheduleTool(this.service),
			new CronDeleteScheduleTool(this.service),
			new CronRunScheduleNowTool(this.service),
			new CronNextRunsTool(this.service),
		];
	}
}
