import { rememberSkill } from '../../../../../src/main/agent/context/context_remember_skill';
import type { AgentContext } from '../../../../../src/main/agent/context/context_types';

describe('rememberSkill', () => {
	it('adds a skill to an empty context', () => {
		const context: AgentContext = { toolsContext: {} };
		rememberSkill(context, 'writer', 'content');
		expect(context.loadedSkills).toEqual([{ name: 'writer', content: 'content' }]);
	});

	it('updates the content of an existing skill in place', () => {
		const context: AgentContext = {
			toolsContext: {},
			loadedSkills: [{ name: 'writer', content: 'old' }],
		};
		rememberSkill(context, 'writer', 'new');
		expect(context.loadedSkills).toEqual([{ name: 'writer', content: 'new' }]);
	});

	it('appends distinct skills', () => {
		const context: AgentContext = { toolsContext: {} };
		rememberSkill(context, 'a', '1');
		rememberSkill(context, 'b', '2');
		expect(context.loadedSkills).toHaveLength(2);
	});
});
