import { listSkills } from '../skills';
import type { LoadedSkill } from '../context';

export function addSkillPrompt(prompt: string, loadedSkills: LoadedSkill[] = []): string {
	const skills = listSkills();
	if (skills.length === 0) return prompt;
	prompt += '\n\n# Skills';
	prompt +=
		"\n\nOnly use the `load_skill` tool when the user's request clearly matches a skill description, or when the user explicitly asks to use a skill. Do NOT load skills to answer questions about them (e.g. listing or describing available skills) — answer those from the list below. Follow the loaded instructions, and resolve bundled scripts, references, and assets against the returned skill directory.";
	prompt += '\n\nAvailable skills:';
	for (const skill of skills) prompt += `\n- ${skill.title}: ${skill.description}`;
	for (const skill of loadedSkills) prompt += `\n\n### Loaded skill: ${skill.name}\n${skill.content}`;
	return prompt;
}
