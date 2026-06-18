import { ToolData } from '../core/tool';
import type { ToolContext } from '../core/tool';
import { EditTool } from './edit';
import { ExecTool } from './exec';
import { ProcessTool } from './process';
import { ReadTool } from './read';
import { WriteTool } from './write';

export class AgentToolData extends ToolData {
	constructor(private readonly context: ToolContext) {
		super();
	}

	tools() {
		return [
			new ReadTool(this.context),
			new WriteTool(this.context),
			new EditTool(this.context),
			new ExecTool(this.context),
			new ProcessTool(this.context),
		];
	}
}
