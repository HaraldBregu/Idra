import { list } from './skills_list';
import { allSkills, setSkills, type SkillSettings } from './skills_store';

export function sync(): void {
	const existing = allSkills();
	const next: Record<string, SkillSettings> = {};
	for (const skill of list()) {
		next[skill.id] = {
			enabled: existing[skill.id]?.enabled ?? true,
			name: skill.id,
			title: skill.name,
			description: skill.description,
		};
	}
	setSkills(next);
}
