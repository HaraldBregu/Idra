import fs from 'node:fs';

jest.mock('node:fs', () => ({
	existsSync: jest.fn(),
	readFileSync: jest.fn(),
}));
jest.mock('../../../../../src/main/skills/skills_read', () => ({
	SKILL_FILE: 'SKILL.md',
}));

import { validateSkill } from '../../../../../src/main/skills/skills_validate';

const existsMock = fs.existsSync as jest.Mock;
const readMock = fs.readFileSync as jest.Mock;

function withFrontmatter(fields: Record<string, string>): string {
	const body = Object.entries(fields)
		.map(([k, v]) => `${k}: ${v}`)
		.join('\n');
	return `---\n${body}\n---\nbody`;
}

beforeEach(() => {
	existsMock.mockReset().mockReturnValue(true);
	readMock.mockReset();
});

describe('validateSkill', () => {
	it('flags a missing SKILL.md', () => {
		existsMock.mockReturnValue(false);
		const result = validateSkill('/skills/x');
		expect(result.valid).toBe(false);
		expect(result.issues[0].code).toBe('missing-skill-md');
	});

	it('passes a well-formed skill', () => {
		readMock.mockReturnValue(withFrontmatter({ name: 'my-skill', description: 'does things' }));
		expect(validateSkill('/skills/x')).toEqual({ valid: true, issues: [] });
	});

	it('flags a missing name and description', () => {
		readMock.mockReturnValue('---\nother: 1\n---\nbody');
		const codes = validateSkill('/skills/x').issues.map((i) => i.code);
		expect(codes).toEqual(expect.arrayContaining(['missing-name', 'missing-description']));
	});

	it('flags an invalid name pattern', () => {
		readMock.mockReturnValue(withFrontmatter({ name: 'Bad_Name', description: 'ok' }));
		const codes = validateSkill('/skills/x').issues.map((i) => i.code);
		expect(codes).toContain('invalid-name');
	});
});
