import { listSkills } from '../skills';

export function addSkillPrompt(prompt: string): string {
	const skills = listSkills();
	if (skills.length === 0) return prompt;
	prompt += '\n\n## Skills';
	prompt +=
		"\nUse the `load_skill` tool when the user's request matches a skill description. Follow the loaded instructions, and resolve bundled scripts, references, and assets against the returned skill directory.";
	prompt += '\n\nAvailable skills:';
	for (const skill of skills) prompt += `\n- ${skill.title}: ${skill.description}`;
	return prompt;
}
