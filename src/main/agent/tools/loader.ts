import type { Tool } from '../types';
import { readTool } from './file/file_read';
import { writeTool } from './file/file_write';
import { editTool } from './file/file_edit';
import { execTool } from './run/run_exec';
import { processTool } from './run/run_process';
import { loadSkillTool } from './skill/skill_load';
import { createScheduleTool } from './automation/cron_create_schedule';
import { updateScheduleTool } from './automation/cron_update_schedule';
import { pauseScheduleTool } from './automation/cron_pause_schedule';
import { resumeScheduleTool } from './automation/cron_resume_schedule';
import { deleteScheduleTool } from './automation/cron_delete_schedule';
import { getScheduleTool } from './automation/cron_get_schedule';
import { listSchedulesTool } from './automation/cron_list_schedules';
import { runScheduleNowTool } from './automation/cron_run_schedule_now';

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
