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

export const requestClarificationTool: AgentTool<{ question: string }> = {
	name: 'request_clarification',
	description: toolDescription('request_clarification'),
	schema: {
		type: 'object',
		properties: {
			question: { type: 'string' },
		},
		required: ['question'],
		additionalProperties: false,
	},
	async execute(args) {
		return textResult(`clarification requested: ${args.question}`);
	},
};

export const presentPlanTool: AgentTool<{ title?: string; steps: string[] }> = {
	name: 'present_plan',
	description: toolDescription('present_plan'),
	schema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			steps: { type: 'array', items: { type: 'string' } },
		},
		required: ['steps'],
		additionalProperties: false,
	},
	async execute(args) {
		const title = args.title?.trim() || 'Plan';
		const steps = Array.isArray(args.steps) ? args.steps : [];
		return textResult([title, ...steps.map((step, index) => `${index + 1}. ${step}`)].join('\n'));
	},
};

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
