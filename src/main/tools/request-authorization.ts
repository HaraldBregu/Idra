import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';

export const requestAuthorizationTool: AgentTool<{ action: string; scope?: string; reason?: string }> = {
	name: 'request_authorization',
	description: toolDescription('request_authorization'),
	schema: {
		type: 'object',
		properties: {
			action: { type: 'string' },
			scope: { type: 'string' },
			reason: { type: 'string' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args) {
		const lines = [`authorized: ${args.action}`];
		if (args.scope) lines.push(`scope: ${args.scope}`);
		if (args.reason) lines.push(`reason: ${args.reason}`);
		return textResult(lines.join('\n'));
	},
};
