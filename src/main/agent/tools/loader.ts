import { ToolData} from '../core/tool';
import type { Context, Tool } from '../core/tool';
import { ReadTool, WriteTool, EditTool } from './filesystem/filesystem';
import { ExecTool, ProcessTool } from './runtime';

export class ToolLoader extends ToolData {
	constructor(
		private readonly context: Context,
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
		];
	}
}
