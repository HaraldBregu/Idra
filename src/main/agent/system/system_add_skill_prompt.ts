import { getLoopContext } from '../run/run_common';

export function addSkillPrompt(prompt: string): string {
	const skill = getLoopContext().selectedSkill;
	if (!skill) return prompt;
	prompt += `\n\n## Active skill: ${skill.name}`;
	prompt += `\nSkill directory: ${skill.directory}`;
	prompt += `\n\n${skill.content}`;
	return prompt;
}
