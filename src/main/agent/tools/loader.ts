import type { Context, Tool } from '../core/types';
import { ReadTool } from './filesystem/read';
import { WriteTool } from './filesystem/write';
import { EditTool } from './filesystem/edit';
import { ExecTool } from './runtime/exec';
import { ProcessTool } from './runtime/process';
import { LoadSkillTool } from './skills/load';
import {
	CreateScheduleTool,
	UpdateScheduleTool,
	PauseScheduleTool,
	ResumeScheduleTool,
	DeleteScheduleTool,
	GetScheduleTool,
	ListSchedulesTool,
	RunScheduleNowTool,
} from './automation/cron';

export class ToolsLoader {
	constructor(private readonly context: Context) {}

	get tools(): Tool[] {
		return [
			// Filesystem Tools
			new ReadTool(this.context),
			new WriteTool(this.context),
			new EditTool(this.context),

			// Runtime Tools
			new ExecTool(this.context),
			new ProcessTool(this.context),

			// Skills Tools
			new LoadSkillTool(this.context),

			// Automation Tools
			new CreateScheduleTool(this.context),
			new UpdateScheduleTool(this.context),
			new PauseScheduleTool(this.context),
			new ResumeScheduleTool(this.context),
			new DeleteScheduleTool(this.context),
			new GetScheduleTool(this.context),
			new ListSchedulesTool(this.context),
			new RunScheduleNowTool(this.context),
		];
	}
}
