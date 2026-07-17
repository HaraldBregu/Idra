export interface LoadedSkill {
	name: string;
	content: string;
}

export interface ToolContextState {
	toolName: string;
	fileName: string;
	path: string;
}

export interface AgentContext {
	skill?: string;
	loadedSkills?: LoadedSkill[];
	tools?: ToolContextState[];
}
