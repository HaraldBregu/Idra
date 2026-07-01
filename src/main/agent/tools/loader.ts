import type { Tool } from '../types';
import { readTool } from './filesystem/read';
import { writeTool } from './filesystem/write';
import { editTool } from './filesystem/edit';
import { execTool } from './runtime/exec';
import { processTool } from './runtime/process';
import { loadSkillTool } from './skills/load';
import { createScheduleTool } from './automation/cron-create-schedule';
import { updateScheduleTool } from './automation/cron-update-schedule';
import { pauseScheduleTool } from './automation/cron-pause-schedule';
import { resumeScheduleTool } from './automation/cron-resume-schedule';
import { deleteScheduleTool } from './automation/cron-delete-schedule';
import { getScheduleTool } from './automation/cron-get-schedule';
import { listSchedulesTool } from './automation/cron-list-schedules';
import { runScheduleNowTool } from './automation/cron-run-schedule-now';

export class ToolsLoader {
	get tools(): Tool[] {
		return [
			// Filesystem Tools
			readTool,
			writeTool,
			editTool,

			// Runtime Tools
			execTool,
			processTool,

			// Skills Tools
			loadSkillTool,

			// Automation Tools
			createScheduleTool,
			updateScheduleTool,
			pauseScheduleTool,
			resumeScheduleTool,
			deleteScheduleTool,
			getScheduleTool,
			listSchedulesTool,
			runScheduleNowTool,
		];
	}
}
