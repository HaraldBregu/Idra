import { ToolData as ToolDataAbstract} from '../core/tool';
import type { Context } from '../core/tool';
import { EditTool } from './edit';
import { ExecTool } from './exec';
import { ProcessTool } from './process';
import { ReadTool } from './read';
import { WriteTool } from './write';

export class ToolData extends ToolDataAbstract {
	constructor(private readonly context: Context) {
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
