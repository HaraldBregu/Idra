import { AGENT_TOOLS, type AgentToolMetadata } from '../tools';

export interface SharedAgentDefinition {
	id: string;
	name: string;
	description: string;
	tools: readonly AgentToolMetadata[];
}

export const assistant = {
	id: 'assistant',
	name: 'Assistant',
	description: 'A general-purpose assistant that can answer questions and use shared tools.',
	tools: AGENT_TOOLS,
} as const satisfies SharedAgentDefinition;
