import type { AgentContext } from './context_types';

export function rememberSkill(
	context: AgentContext,
	skill: NonNullable<AgentContext['loadedSkills']>[number]
): void {
	const skills = (context.loadedSkills ??= []);
	const existing = skills.find((candidate) => candidate.id === skill.id);
	if (existing) Object.assign(existing, skill);
	else skills.push(skill);
}
