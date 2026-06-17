import { CronData as AgentCronData } from '../agent/core/cron-data';
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

export class CronData extends AgentCronData {
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
