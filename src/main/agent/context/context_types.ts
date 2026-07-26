export interface LoadedSkill {
	name: string;
	content: string;
}

export interface ToolContextState {
	toolName: string;
	fileName: string;
	path: string;
	folderPath: string;
}

export interface ToolsContext {
	tools?: ToolContextState[];
	cancelled?: boolean;
}

export interface AgentContext {
	skill?: string;
	loadedSkills?: LoadedSkill[];
	project?: string;
	basePrompt?: string;
	systemPrompt?: string;
	toolsContext: ToolsContext;
	subagents?: AgentContext[];
}
