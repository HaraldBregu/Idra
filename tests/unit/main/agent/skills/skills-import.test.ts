const pickDirectories = jest.fn();
const validateSkill = jest.fn();
const readSkill = jest.fn();
const mkdirSync = jest.fn();
const existsSync = jest.fn();
const cpSync = jest.fn();
const renameSync = jest.fn();
const rmSync = jest.fn();
const validateSkillPackage = jest.fn();
const setSkillPolicy = jest.fn();

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
	validateSkillPackage,
}));
jest.mock('../../../../../src/main/agent/skills/skills_policy_set', () => ({
	setSkillPolicy,
}));

import { importSkills } from '../../../../../src/main/agent/skills/skills_import';

describe('importSkills replacement safety', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		pickDirectories.mockResolvedValue(['/incoming/example']);
		validateSkill.mockReturnValue({ valid: true, issues: [] });
		readSkill.mockReturnValue({ name: 'example' });
		existsSync.mockReturnValue(false);
	});

	it('refuses to overwrite an installed skill without a confirmation flow', async () => {
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

	it('stages, validates, disables, and atomically renames a new import', async () => {
		const result = await importSkills();

		expect(validateSkillPackage).toHaveBeenCalledTimes(2);
		expect(setSkillPolicy).toHaveBeenCalledWith(
			'example',
			expect.objectContaining({ enabled: false, trusted: false, invocationPolicy: 'implicit' })
		);
		expect(renameSync).toHaveBeenCalledWith(
			expect.stringMatching(/\/\.import-example-.+\/example$/),
			'/installed-skills/example'
		);
		expect(result?.imported).toEqual([{ name: 'example' }]);
	});

	it('removes staging after a partial copy failure', async () => {
		cpSync.mockImplementationOnce(() => {
			throw new Error('copy failed');
		});
		const result = await importSkills();

		expect(renameSync).not.toHaveBeenCalled();
		expect(rmSync).toHaveBeenCalledWith(expect.stringMatching(/\/\.import-example-.+$/), {
			recursive: true,
			force: true,
		});
		expect(result?.skipped[0].reason).toContain('copy failed');
	});

	it('rolls back the final directory if post-rename verification fails', async () => {
		readSkill.mockReturnValueOnce({ name: 'example' }).mockReturnValueOnce(undefined);
		const result = await importSkills();

		expect(renameSync).toHaveBeenCalled();
		expect(rmSync).toHaveBeenCalledWith('/installed-skills/example', {
			recursive: true,
			force: true,
		});
		expect(result?.imported).toEqual([]);
	});
});
