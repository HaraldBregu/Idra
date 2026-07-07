import { listSkills } from '../skills';
import type { LoadedSkill } from '../context';

export function addSkillPrompt(prompt: string, loadedSkills: LoadedSkill[] = []): string {
	const skills = listSkills();
	if (skills.length === 0) return prompt;
	prompt += '\n\n## Skills';
	prompt +=
		"\nUse the `load_skill` tool when the user's request matches a skill description. Follow the loaded instructions, and resolve bundled scripts, references, and assets against the returned skill directory.";
	prompt += '\n\nAvailable skills:';
	for (const skill of skills) prompt += `\n- ${skill.title}: ${skill.description}`;
	for (const skill of loadedSkills) prompt += `\n\n### Loaded skill: ${skill.name}\n${skill.content}`;
	return prompt;
}
