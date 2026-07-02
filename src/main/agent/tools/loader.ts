import type { Tool } from '../types';
import { readTool } from './file_read';
import { writeTool } from './file_write';
import { editTool } from './file_edit';
import { execTool } from './run_exec';
import { processTool } from './run_process';
import { loadSkillTool } from './skill_load';
import { createScheduleTool } from './cron_create_schedule';
import { updateScheduleTool } from './cron_update_schedule';
import { pauseScheduleTool } from './cron_pause_schedule';
import { resumeScheduleTool } from './cron_resume_schedule';
import { deleteScheduleTool } from './cron_delete_schedule';
import { getScheduleTool } from './cron_get_schedule';
import { listSchedulesTool } from './cron_list_schedules';
import { runScheduleNowTool } from './cron_run_schedule_now';

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
