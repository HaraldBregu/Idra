export interface AgentToolMetadata {
	name: string;
	label: string;
	description: string;
}

export function defineAgentTools<const TTools extends readonly AgentToolMetadata[]>(tools: TTools) {
	return tools;
}
