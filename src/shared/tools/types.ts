export interface AgentToolMetadata {
	name: string;
	title: string;
	description: string;
}

export function defineAgentTools<const TTools extends readonly AgentToolMetadata[]>(tools: TTools) {
	return tools;
}
