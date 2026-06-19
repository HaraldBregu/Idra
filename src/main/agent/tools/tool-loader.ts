import { ToolData} from '../core/tool';
import type { Context, Tool } from '../core/tool';
import type { Workspace } from '../core/workspace';
import { EditTool } from './edit';
import { ExecTool } from './exec';
import { ProcessTool } from './process';
import { ReadTool } from './read';
import { WriteTool } from './write';
import { UpdateIdentityTool } from './identity';
import { ReadIdentityTool } from './read-identity';

export class ToolLoader extends ToolData {
	constructor(
		private readonly context: Context,
		private readonly workspace: Workspace
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
			new UpdateIdentityTool(this.workspace, this.context),
		];
	}
}
