import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';

export const requestApprovalTool: AgentTool<{ action: string; reason?: string }> = {
	name: 'request_approval',
	description: toolDescription('request_approval'),
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
