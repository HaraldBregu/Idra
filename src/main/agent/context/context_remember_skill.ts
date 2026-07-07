import type { AgentContext } from './context_types';

export function rememberSkill(context: AgentContext, name: string, content: string): void {
	const skills = (context.loadedSkills ??= []);
	const existing = skills.find((skill) => skill.name === name);
	if (existing) existing.content = content;
	else skills.push({ name, content });
}
