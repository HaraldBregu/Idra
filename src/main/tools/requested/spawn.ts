import { agentInputItemSchema, objectSchema, type RequestedTool } from './shared';

export const spawnAgentTool = {
	name: 'multi_agent_v1.spawn_agent',
	description: 'Starts a delegated sub-agent for a well-scoped task.',
	schema: objectSchema({
		agent_type: { type: 'string' },
		fork_context: { type: 'boolean' },
		items: { type: 'array', items: agentInputItemSchema },
		message: { type: 'string' },
		model: { type: 'string' },
		reasoning_effort: { type: 'string' },
		service_tier: { type: 'string' },
	}),
} as const satisfies RequestedTool;
