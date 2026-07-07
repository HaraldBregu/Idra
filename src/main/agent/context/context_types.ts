export interface LoadedSkill {
	name: string;
	content: string;
}

export interface AgentContext {
	skill?: string;
	loadedSkills?: LoadedSkill[];
}
