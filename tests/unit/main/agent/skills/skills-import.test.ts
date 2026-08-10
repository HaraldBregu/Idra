const pickDirectories = jest.fn();
const validateSkill = jest.fn();
const readSkill = jest.fn();
const mkdirSync = jest.fn();
const existsSync = jest.fn();
const cpSync = jest.fn();
const renameSync = jest.fn();
const rmSync = jest.fn();

jest.mock('node:fs', () => ({ mkdirSync, existsSync, cpSync, renameSync, rmSync }));
jest.mock('../../../../../src/main/agent/skills/skills_root', () => ({
	skillsRoot: '/installed-skills',
}));
jest.mock('../../../../../src/main/agent/skills/skills_pick_directories', () => ({
	pickDirectories,
}));
jest.mock('../../../../../src/main/agent/skills/skills_validate', () => ({ validateSkill }));
jest.mock('../../../../../src/main/agent/skills/skills_read', () => ({ readSkill }));
jest.mock('../../../../../src/main/agent/skills/skills_validate_package', () => ({
	validateSkillPackage: jest.fn(),
}));
jest.mock('../../../../../src/main/agent/skills/skills_policy_set', () => ({
	setSkillPolicy: jest.fn(),
}));

import { importSkills } from '../../../../../src/main/agent/skills/skills_import';

describe('importSkills replacement safety', () => {
	it('refuses to overwrite an installed skill without a confirmation flow', async () => {
		pickDirectories.mockResolvedValue(['/incoming/example']);
		validateSkill.mockReturnValue({ valid: true, issues: [] });
		readSkill.mockReturnValue({ name: 'example' });
		existsSync.mockReturnValue(true);

		const result = await importSkills();

		expect(result?.imported).toEqual([]);
		expect(result?.skipped).toEqual([
			expect.objectContaining({
				name: 'example',
				reason: expect.stringContaining('Delete it before importing a replacement'),
			}),
		]);
		expect(cpSync).not.toHaveBeenCalled();
	});
});
