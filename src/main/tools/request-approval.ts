import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';

export const requestApprovalTool: AgentTool<{ action: string; reason?: string }> = {
	name: 'request_approval',
	description: 'Ask a human to approve or deny a proposed action.',
	schema: {
		type: 'object',
		properties: {
			action: { type: 'string' },
			reason: { type: 'string' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args) {
		return textResult(`approved: ${args.action}${args.reason ? `\nreason: ${args.reason}` : ''}`);
	},
};
