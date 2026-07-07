import type { LoadedSkill } from '../context';
import type { Message } from '../types';

const LOAD_SKILL_TOOL = 'load_skill';

export function loadLoadedSkills(messages: Message[]): LoadedSkill[] {
	const skills: LoadedSkill[] = [];
	for (const message of messages) {
		for (const call of message.toolCalls ?? []) {
			if (call.name !== LOAD_SKILL_TOOL || typeof call.result?.content !== 'string') continue;
			let value: { skill?: unknown; content?: unknown };
			try {
				value = JSON.parse(call.result.content);
			} catch {
				continue;
			}
			if (typeof value.skill !== 'string' || typeof value.content !== 'string') continue;
			const existing = skills.find((skill) => skill.name === value.skill);
			if (existing) existing.content = value.content;
			else skills.push({ name: value.skill, content: value.content });
		}
	}
	return skills;
}
