import { rememberSkill } from '../../../../../src/main/agent/context/context_remember_skill';
import type { AgentContext } from '../../../../../src/main/agent/context/context_types';

describe('rememberSkill', () => {
	const skill = (id: string, instructions: string) => ({
		id,
		name: id,
		canonicalRoot: `/skills/${id}`,
		instructions,
		trust: 'user-controlled' as const,
		hash: `${id}-hash`,
		resources: [],
	});

	it('adds a skill to an empty context', () => {
		const context: AgentContext = { toolsContext: {} };
		rememberSkill(context, skill('writer', 'content'));
		expect(context.loadedSkills).toEqual([skill('writer', 'content')]);
	});

	it('updates the content of an existing skill in place', () => {
		const context: AgentContext = {
			toolsContext: {},
			loadedSkills: [skill('writer', 'old')],
		};
		rememberSkill(context, skill('writer', 'new'));
		expect(context.loadedSkills).toEqual([skill('writer', 'new')]);
	});

	it('appends distinct skills', () => {
		const context: AgentContext = { toolsContext: {} };
		rememberSkill(context, skill('a', '1'));
		rememberSkill(context, skill('b', '2'));
		expect(context.loadedSkills).toHaveLength(2);
	});
});
