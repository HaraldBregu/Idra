import path from 'node:path';
import { resolveSkillFolder } from '../../../../../src/main/skills/skills_resolve_folder';
import { skillsRoot } from '../../../../../src/main/skills/skills_root';

describe('resolveSkillFolder', () => {
	it('resolves a valid id under the skills root', () => {
		expect(resolveSkillFolder('my-skill')).toBe(path.resolve(skillsRoot, 'my-skill'));
	});
	it('rejects ids with path separators or illegal characters', () => {
		expect(() => resolveSkillFolder('a/b')).toThrow(/Invalid skill id/);
		expect(() => resolveSkillFolder('a b')).toThrow(/Invalid skill id/);
	});
	it('rejects dot and dotdot', () => {
		expect(() => resolveSkillFolder('.')).toThrow(/Invalid skill id/);
		expect(() => resolveSkillFolder('..')).toThrow(/Invalid skill id/);
	});
});
