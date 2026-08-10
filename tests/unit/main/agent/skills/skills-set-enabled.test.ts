const readSkill = jest.fn();
const setSkillPolicy = jest.fn();

jest.mock('../../../../../src/main/agent/skills/skills_read', () => ({ readSkill }));
jest.mock('../../../../../src/main/agent/skills/skills_resolve_folder', () => ({
	resolveSkillFolder: () => '/skills/writer',
}));
jest.mock('../../../../../src/main/agent/skills/skills_policy_set', () => ({ setSkillPolicy }));

import { setEnabled } from '../../../../../src/main/agent/skills/skills_set_enabled';

describe('setEnabled', () => {
	it('stores enablement and review hash outside the portable package', () => {
		const before = { id: 'writer', hash: 'hash', enabled: false };
		const after = { ...before, enabled: true };
		readSkill.mockReturnValueOnce(before).mockReturnValueOnce(after);

		expect(setEnabled('writer', true)).toBe(after);
		expect(setSkillPolicy).toHaveBeenCalledWith('writer', {
			enabled: true,
			trusted: true,
			reviewedHash: 'hash',
		});
	});
});
