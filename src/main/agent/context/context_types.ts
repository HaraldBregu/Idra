export interface LoadedSkill {
	id: string;
	name: string;
	canonicalRoot: string;
	instructions: string;
	source?: 'local-filesystem';
	trust: 'user-controlled';
	hash: string;
	allowedTools?: string[];
	resources: string[];
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
	hasPrivateContext?: boolean;
}

export interface AgentContext {
	skill?: string;
	loadedSkills?: LoadedSkill[];
	basePrompt?: string;
	systemPrompt?: string;
	toolsContext: ToolsContext;
	subagents?: AgentContext[];
}
