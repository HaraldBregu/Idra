import { objectSchema, type RequestedTool } from './shared';

export const resumeAgentTool = {
	name: 'multi_agent_v1.resume_agent',
	description: 'Resumes a previously closed agent by id so it can receive input or be waited on.',
	schema: objectSchema({ id: { type: 'string' } }, ['id']),
} as const satisfies RequestedTool;
