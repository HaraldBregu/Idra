const list = jest.fn();

jest.mock('../../../../../src/main/agent/skills/skills_list', () => ({ list }));

import { listSkills } from '../../../../../src/main/agent/skills/skills_list_skills';

describe('listSkills', () => {
	it('excludes disabled, unreviewed, and explicit-only skills from implicit routing', () => {
		const skill = (name: string, overrides: Record<string, unknown> = {}) => ({
			name,
			description: name,
			enabled: true,
			invocationPolicy: 'implicit',
			trust: 'user-controlled',
			...overrides,
		});
		list.mockReturnValue([
			skill('visible'),
			skill('disabled', { enabled: false }),
			skill('unreviewed', { trust: 'unreviewed' }),
			skill('explicit', { invocationPolicy: 'explicit' }),
		]);
		expect(listSkills()).toEqual([{ title: 'visible', description: 'visible' }]);
	});
});
