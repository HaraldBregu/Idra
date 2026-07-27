jest.mock('../../../../../src/main/skills', () => ({
	listSkills: jest.fn(() => [{ title: 'Writer', description: 'Draft documents' }]),
}));

import { addBasePrompt } from '../../../../../src/main/agent/system/system_add_base_prompt';
import { addSkillPrompt } from '../../../../../src/main/agent/system/system_add_skill_prompt';
import { addToolsPrompt } from '../../../../../src/main/agent/system/system_add_tools_prompt';
import { hasUserProfile } from '../../../../../src/main/agent/system/system_has_user_profile';
import type { Tool } from '../../../../../src/main/agent/types';

function tool(name: string, description?: string): Tool {
	return { name, description } as Tool;
}

describe('addBasePrompt', () => {
	it('appends the assistant identity and standard sections', () => {
		const prompt = addBasePrompt('');
		expect(prompt).toContain('You are a personal AI assistant.');
		expect(prompt).toContain('## Voice');
		expect(prompt).toContain('## Workspace contract');
		expect(prompt).toContain('## Agent acceptance contract');
	});
	it('appends to any existing prompt', () => {
		expect(addBasePrompt('PRE')).toMatch(/^PRE/);
	});
});

describe('addToolsPrompt', () => {
	it('returns the prompt unchanged when there are no tools', () => {
		expect(addToolsPrompt('base', [])).toBe('base');
	});
	it('renders a markdown table of tools', () => {
		const prompt = addToolsPrompt('base', [tool('read', 'Read a file'), tool('write')]);
		expect(prompt).toContain('## Tools');
		expect(prompt).toContain('| `read` | Read a file |');
		expect(prompt).toContain('| `write` |  |');
	});
	it('flattens newlines in descriptions', () => {
		const prompt = addToolsPrompt('base', [tool('x', 'line1\nline2')]);
		expect(prompt).toContain('| `x` | line1 line2 |');
	});
	it('omits MCP tools while retaining built-in tools', () => {
		const prompt = addToolsPrompt('base', [
			tool('read', 'Read a file'),
			tool('mcp__notion__notion-search', 'Search Notion'),
		]);
		expect(prompt).toContain('| `read` | Read a file |');
		expect(prompt).not.toContain('mcp__notion__notion-search');
		expect(prompt).not.toContain('Search Notion');
	});
	it('does not add a tools section when only MCP tools are provided', () => {
		const prompt = addToolsPrompt('base', [tool('mcp__notion__notion-search')]);
		expect(prompt).toBe('base');
	});
});

describe('addSkillPrompt', () => {
	it('lists available skills and appends loaded instructions', () => {
		const prompt = addSkillPrompt('base', [{ name: 'Writer', content: 'Follow this workflow.' }]);

		expect(prompt).toContain('- Writer: Draft documents');
		expect(prompt).toContain('### Loaded skill: Writer');
		expect(prompt).toContain('Follow this workflow.');
	});
});

describe('hasUserProfile', () => {
	it('is true when a bold field has a value', () => {
		expect(hasUserProfile('- **Name:** Alice')).toBe(true);
	});
	it('is false when fields are empty', () => {
		expect(hasUserProfile('- **Name:**')).toBe(false);
		expect(hasUserProfile('- **Name:**   ')).toBe(false);
	});
	it('is false when there are no profile fields', () => {
		expect(hasUserProfile('just some prose\nmore prose')).toBe(false);
	});
});
