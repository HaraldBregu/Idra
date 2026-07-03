import type { SkillLoadResult } from '../../../shared/skills_types';

export interface ToolContext {
	selectedSkill?: SkillLoadResult;
}

// ponytail: module-level singleton, move onto SessionState if per-session context is needed
const context: ToolContext = {};

export function getToolContext(): ToolContext {
	return context;
}
