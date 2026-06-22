import { ToolData} from '../core/tool';
import type { Context, Tool } from '../core/tool';
import type { Cron } from '../core/cron';
import { ReadTool } from './filesystem/read';
import { WriteTool } from './filesystem/write';
import { EditTool } from './filesystem/edit';
import { ExecTool } from './runtime/exec';
import { ProcessTool } from './runtime/process';
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

export class ToolLoader extends ToolData {
	constructor(
		private readonly context: Context,
		private readonly cron: Cron,
	) {
		super();
	}

	get tools(): Tool[] {
		return [
			new ReadTool(this.context),
			new WriteTool(this.context),
			new EditTool(this.context),
			new ExecTool(this.context),
			new ProcessTool(this.context),
			new CreateScheduleTool(this.cron, this.context),
			new UpdateScheduleTool(this.cron, this.context),
			new PauseScheduleTool(this.cron, this.context),
			new ResumeScheduleTool(this.cron, this.context),
			new DeleteScheduleTool(this.cron, this.context),
			new GetScheduleTool(this.cron, this.context),
			new ListSchedulesTool(this.cron, this.context),
			new RunScheduleNowTool(this.cron, this.context),
		];
	}
}
