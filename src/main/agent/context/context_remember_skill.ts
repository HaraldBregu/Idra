import type { AgentContext } from './context_types';

export function rememberSkill(
	context: AgentContext,
	name: string,
	content: string,
	metadata: Omit<NonNullable<AgentContext['loadedSkills']>[number], 'name' | 'content'> = {}
): void {
	const skills = (context.loadedSkills ??= []);
	const existing = skills.find((skill) => skill.name === name);
	if (existing) Object.assign(existing, { content, ...metadata });
	else skills.push({ name, content, ...metadata });
}
