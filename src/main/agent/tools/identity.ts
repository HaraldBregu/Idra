import { WorkspaceTool } from '../core/tool';
import { ToolContext } from './tool-context';
import type { Context } from '../core/tool';
import type { Workspace } from '../core/workspace';
import type { JSONSchema } from '../core/types';

export class UpdateIdentityTool extends WorkspaceTool {
	readonly name = 'update_identity';
	readonly description = 'Overwrite the agent IDENTITY.md workspace file with new UTF-8 content.';
	readonly schema: JSONSchema = {
		type: 'object',
		properties: {
			content: {
				type: 'string',
				description: 'Full UTF-8 text content to write to IDENTITY.md.',
			},
		},
		required: ['content'],
		additionalProperties: false,
	};

	constructor(workspace: Workspace, context: Context = new ToolContext()) {
		super(workspace, context);
	}

	async run(input: Record<string, unknown>): Promise<{ path: string }> {
		const content = input.content;
		if (typeof content !== 'string') {
			throw new Error('update_identity requires string content.');
		}
		await this.workspace.setIdentityText(content);
		return { path: this.workspace.getPath() };
	}
}
