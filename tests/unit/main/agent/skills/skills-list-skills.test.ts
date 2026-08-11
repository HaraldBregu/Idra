const list = jest.fn();

jest.mock('../../../../../src/main/agent/skills/skills_list', () => ({ list }));

import { listSkills } from '../../../../../src/main/agent/skills/skills_list_skills';

describe('listSkills', () => {
	it('returns every skill found in the skills folder', () => {
		const skill = (name: string) => ({
			name,
			description: name,
			trust: 'user-controlled',
		});
		list.mockReturnValue([skill('writer'), skill('researcher')]);
		expect(listSkills()).toEqual([
			{ title: 'writer', description: 'writer' },
			{ title: 'researcher', description: 'researcher' },
		]);
	});
});
