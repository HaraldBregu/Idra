import type { Tool } from '../../../../../src/main/agent/types';
import { selectSkillTools } from '../../../../../src/main/agent/run/run_skill_tools';

function fakeTool(name: string): Tool {
	return {
		name,
		description: name,
		schema: { type: 'object' },
		risk: 'low',
		effect: 'read',
		timeoutMs: 1_000,
		maxOutputBytes: 1_000,
		parseInput: () => ({}),
		run: () => undefined,
	};
}

describe('selectSkillTools', () => {
	it('intersects runtime tools with declared capabilities', () => {
		const tools = [fakeTool('read'), fakeTool('write'), fakeTool('subagent')];
		expect(
			selectSkillTools([...tools, fakeTool('load_skill')], ['read', 'subagent']).map(
				(tool) => tool.name
			)
		).toEqual(['read', 'load_skill']);
	});

	it('keeps backward-compatible tools when no capability list is declared', () => {
		const tools = [fakeTool('read')];
		expect(selectSkillTools(tools, undefined)).toBe(tools);
	});
});
