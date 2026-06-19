import { ToolData} from '../core/tool';
import type { Context, Tool } from '../core/tool';
import { ReadTool } from './filesystem/read';
import { WriteTool } from './filesystem/write';
import { EditTool } from './filesystem/edit';
import { ExecTool } from './runtime/exec';
import { ProcessTool } from './runtime/process';

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
