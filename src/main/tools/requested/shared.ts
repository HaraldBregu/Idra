import type { AgentTool } from '../base/tool';

export type RequestedTool = Omit<AgentTool, 'execute'>;

export const stringArraySchema = { type: 'array', items: { type: 'string' } };

export const agentInputItemSchema = {
	type: 'object',
	properties: {
		type: { type: 'string', enum: ['text', 'image', 'local_image', 'skill', 'mention'] },
		text: { type: 'string' },
		path: { type: 'string' },
		name: { type: 'string' },
		image_url: { type: 'string' },
	},
	additionalProperties: false,
};

export function objectSchema(properties: Record<string, unknown> = {}, required: string[] = []) {
	return {
		type: 'object',
		properties,
		required,
		additionalProperties: false,
	};
}
