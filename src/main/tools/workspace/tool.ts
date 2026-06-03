import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { applyPatchTool } from '../filesystem/apply-patch';

type WorkspaceAction = 'apply_patch';

interface WorkspaceArgs {
	action: WorkspaceAction;
	diff?: string;
}

export const workspaceTool: AgentTool<WorkspaceArgs> = {
	name: 'workspace',
	description:
		'Run a structured workspace filesystem action. Supports apply_patch while preserving file safety checks.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['apply_patch'],
				description: 'Workspace filesystem action to perform.',
			},
			diff: { type: 'string', description: 'Unified diff text for apply_patch.' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		switch (args.action) {
			case 'apply_patch':
				if (typeof args.diff !== 'string' || args.diff.trim() === '')
					return textResult('workspace: diff is required for apply_patch.', true);
				return applyPatchTool.execute({ diff: args.diff }, ctx);
			default:
				return textResult(`workspace: unsupported action ${String(args.action)}`, true);
		}
	},
};
