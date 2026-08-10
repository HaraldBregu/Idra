import { z } from 'zod';
import { tool } from '../tool';
import { activateSkill } from '../../skills';
import type { SkillLoadResult, SkillRegistrySnapshot } from '../../../../shared/skills_types';
import type { Tool } from '../../types';

export function createLoadSkillTool(
	snapshot: SkillRegistrySnapshot,
	onActivate: (skill: SkillLoadResult) => void
): Tool | undefined {
	const names = snapshot.skills
		.filter(
			(skill) =>
				skill.enabled && skill.trust === 'user-controlled' && skill.invocationPolicy === 'implicit'
		)
		.map((skill) => skill.name);
	if (names.length === 0) return undefined;
	return tool({
		id: 'load_skill',
		name: 'Load skill',
		description:
			'Activate an Agent Skill for this run. The harness injects its protected instructions and canonical resource root on the next model turn.',
		inputSchema: z.object({
			name: z.enum(names as [string, ...string[]]).describe('The exact skill name to activate.'),
		}),
		execute: async ({ name }) => {
			const skill = await activateSkill(snapshot, name);
			onActivate(skill);
			return {
				activated: true,
				id: skill.id,
				name: skill.name,
				canonicalRoot: skill.canonicalRoot,
				hash: skill.hash,
				trust: skill.trust,
				resources: skill.resources,
				warnings: skill.warnings,
			};
		},
	});
}
