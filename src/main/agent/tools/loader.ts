import type { Context, Tool } from '../types';
import { ReadTool } from './filesystem/read';
import { WriteTool } from './filesystem/write';
import { EditTool } from './filesystem/edit';
import { ExecTool } from './runtime/exec';
import { ProcessTool } from './runtime/process';
import { LoadSkillTool } from './skills/load';
import { CreateScheduleTool } from './automation/create';
import { UpdateScheduleTool } from './automation/update';
import { PauseScheduleTool } from './automation/pause';
import { ResumeScheduleTool } from './automation/resume';
import { DeleteScheduleTool } from './automation/delete';
import { GetScheduleTool } from './automation/get';
import { ListSchedulesTool } from './automation/list';
import { RunScheduleNowTool } from './automation/run';

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
