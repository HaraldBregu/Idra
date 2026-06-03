import { objectSchema, type RequestedTool } from './shared';

export const closeAgentTool = {
	name: 'multi_agent_v1.close_agent',
	description: 'Closes an agent and open descendants when they are no longer needed.',
	schema: objectSchema({ target: { type: 'string' } }, ['target']),
} as const satisfies RequestedTool;
