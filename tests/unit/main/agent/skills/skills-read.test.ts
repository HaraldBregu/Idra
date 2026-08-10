import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readSkill } from '../../../../../src/main/agent/skills/skills_read';

jest.mock('../../../../../src/main/agent/skills/skills_policy_read', () => ({
	readSkillPolicyState: () => ({ skills: {} }),
}));

describe('readSkill', () => {
	it('records the validated local source, trust, and exact content hash', () => {
		const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-skill-'));
		const source = '---\nname: safe-skill\ndescription: Safe\nallowed-tools: read write\n---\nBody';
		try {
			fs.writeFileSync(path.join(folder, 'SKILL.md'), source);
			const skill = readSkill(folder, 'safe-skill');
			expect(skill).toEqual(
				expect.objectContaining({
					source: 'local-filesystem',
					trust: 'user-controlled',
					hash: createHash('sha256').update(source).digest('hex'),
				})
			);
			expect(skill?.manifest.allowedTools).toEqual(['read', 'write']);
			expect(skill).toEqual(expect.objectContaining({ enabled: true, invocationPolicy: 'implicit' }));
		} finally {
			fs.rmSync(folder, { recursive: true, force: true });
		}
	});
});
