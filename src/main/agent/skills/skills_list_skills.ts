import { list } from './skills_list';

export function listSkills(): { title: string; description: string }[] {
	return list()
		.filter((skill) => skill.enabled && skill.invocationPolicy === 'implicit' && skill.trust === 'user-controlled')
		.map((skill) => ({ title: skill.name, description: skill.description }));
}
