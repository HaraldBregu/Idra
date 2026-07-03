import type { SkillLoadResult } from '../../../shared/skills_types';
import type { Config } from '../types';
import { buildSystemPrompt } from '../system';

export interface LoopContext {
	selectedSkill?: SkillLoadResult;
	systemPrompt?: string;
}

// ponytail: module-level singleton, move onto SessionState if per-session context is needed
const context: LoopContext = {};

export function getLoopContext(): LoopContext {
	return context;
}

export async function refreshLoopContext(config: Config): Promise<LoopContext> {
	context.systemPrompt = await buildSystemPrompt(config);
	return context;
}
