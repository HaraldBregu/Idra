import { list } from './skills_list';

export function listSkills(): { title: string; description: string }[] {
	return list()
		.filter((skill) => skill.manifest.enabled !== false)
		.map((skill) => ({ title: skill.name, description: skill.description }));
}
