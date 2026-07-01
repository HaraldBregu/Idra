import type { Tool } from '../types';
import { readTool } from './file/file-read';
import { writeTool } from './file/file-write';
import { editTool } from './file/file-edit';
import { execTool } from './run/run-exec';
import { processTool } from './run/run-process';
import { loadSkillTool } from './skill/skill-load';
import { createScheduleTool } from './automation/cron-create-schedule';
import { updateScheduleTool } from './automation/cron-update-schedule';
import { pauseScheduleTool } from './automation/cron-pause-schedule';
import { resumeScheduleTool } from './automation/cron-resume-schedule';
import { deleteScheduleTool } from './automation/cron-delete-schedule';
import { getScheduleTool } from './automation/cron-get-schedule';
import { listSchedulesTool } from './automation/cron-list-schedules';
import { runScheduleNowTool } from './automation/cron-run-schedule-now';

export function loadTools(): Tool[] {
	return [
		// File Tools
		readTool,
		writeTool,
		editTool,

		// Run Tools
		execTool,
		processTool,

		// Skill Tools
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
