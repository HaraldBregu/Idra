import { agentInputItemSchema, objectSchema, type RequestedTool } from './shared';

export const sendInputTool = {
	name: 'multi_agent_v1.send_input',
	description: 'Sends a message or structured input items to an existing sub-agent.',
	schema: objectSchema({
		target: { type: 'string' },
		interrupt: { type: 'boolean' },
		items: { type: 'array', items: agentInputItemSchema },
		message: { type: 'string' },
	}, ['target']),
} as const satisfies RequestedTool;
