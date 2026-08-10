import { list } from './skills_list';

const normalize = (value: string): string => value.toLowerCase().replace(/[-_\s]/g, '');

export function resolveSkillCommand(message: string): string {
	const match = message.match(/^\/skill\s+(\S+)\s*([\s\S]*)$/i);
	if (!match) return message;
	const wanted = normalize(match[1]);
	const skill = list()
		.filter((entry) => entry.enabled)
		.find((entry) => normalize(entry.name) === wanted || normalize(entry.id) === wanted);
	if (!skill) return message;
	const args = match[2].trim();
	return `Use the "${skill.name}" skill for this request.${args ? `\n\nUser input:\n${args}` : ''}`;
}
