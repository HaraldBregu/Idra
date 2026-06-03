import { objectSchema, stringArraySchema, type RequestedTool } from './shared';

export const waitAgentTool = {
	name: 'multi_agent_v1.wait_agent',
	description: 'Waits for one or more sub-agents to reach a final status.',
	schema: objectSchema({
		targets: stringArraySchema,
		timeout_ms: { type: 'number' },
	}, ['targets']),
} as const satisfies RequestedTool;
