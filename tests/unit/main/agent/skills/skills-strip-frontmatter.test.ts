import { stripFrontmatter } from '../../../../../src/main/skills/skills_strip_frontmatter';

describe('stripFrontmatter', () => {
	it('removes a leading YAML frontmatter block', () => {
		const input = '---\nname: x\ndescription: y\n---\n# Title\n\nbody';
		expect(stripFrontmatter(input)).toBe('# Title\n\nbody');
	});
	it('handles CRLF line endings', () => {
		const input = '---\r\nname: x\r\n---\r\nbody';
		expect(stripFrontmatter(input)).toBe('body');
	});
	it('trims content that has no frontmatter', () => {
		expect(stripFrontmatter('  just text  ')).toBe('just text');
	});
	it('leaves a mid-document --- untouched', () => {
		const input = 'intro\n---\nnot frontmatter';
		expect(stripFrontmatter(input)).toBe('intro\n---\nnot frontmatter');
	});
});
