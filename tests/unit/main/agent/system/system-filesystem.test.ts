import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

jest.mock('../../../../../src/main/skills', () => ({
	listSkills: jest.fn(() => []),
}));

import { addFilesystemPrompt } from '../../../../../src/main/agent/system/system_add_filesystem_prompt';
import { buildSystemPrompt } from '../../../../../src/main/agent/system/system_build_prompt';

describe('agent filesystem prompt', () => {
	let root: string;

	beforeEach(async () => {
		root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-agent-filesystem-'));
	});

	afterEach(async () => {
		await fs.rm(root, { recursive: true, force: true });
	});

	it('lists only sorted files and folders directly inside the agent root', async () => {
		await fs.mkdir(path.join(root, 'library', 'archive'), { recursive: true });
		await fs.writeFile(path.join(root, 'library', 'image.jpeg'), 'image-content');
		await fs.writeFile(path.join(root, 'library', 'archive', 'notes.txt'), 'private-content');
		await fs.writeFile(path.join(root, 'notes.txt'), 'root-content');

		const prompt = await addFilesystemPrompt({ location: root }, 'base');
		const inventory = prompt.split('\n').filter((line) => line.startsWith('- "'));

		expect(prompt).toContain('## Agent filesystem');
		expect(prompt).toContain(`Root directory: ${JSON.stringify(root)}`);
		expect(inventory).toEqual(['- "library/"', '- "notes.txt"']);
		expect(prompt).not.toContain('library/archive');
		expect(prompt).not.toContain('library/image.jpeg');
		expect(prompt).not.toContain('image-content');
		expect(prompt).not.toContain('private-content');
		expect(prompt).not.toContain('root-content');
	});

	it('reflects filesystem changes each time the prompt is built', async () => {
		const before = await addFilesystemPrompt({ location: root }, 'base');
		await fs.writeFile(path.join(root, 'new.txt'), 'text');
		const afterCreate = await addFilesystemPrompt({ location: root }, 'base');
		await fs.rm(path.join(root, 'new.txt'));
		const afterDelete = await addFilesystemPrompt({ location: root }, 'base');

		expect(before).not.toContain('new.txt');
		expect(afterCreate).toContain('- "new.txt"');
		expect(afterDelete).not.toContain('new.txt');
	});

	it('keeps the prompt available when the agent root cannot be read', async () => {
		const missingRoot = path.join(root, 'missing');

		const prompt = await addFilesystemPrompt({ location: missingRoot }, 'base');

		expect(prompt).toContain(`Root directory: ${JSON.stringify(missingRoot)}`);
		expect(prompt).toContain('- "." (unavailable)');
	});

	it('adds the live inventory through the normal system prompt builder', async () => {
		await fs.mkdir(path.join(root, 'library'));
		await fs.writeFile(path.join(root, 'library', 'clip.mp4'), 'video');

		const prompt = await buildSystemPrompt({ location: root });

		expect(prompt).toContain('## Agent filesystem');
		expect(prompt).toContain('- "library/"');
		expect(prompt).not.toContain('library/clip.mp4');
	});

	it('includes bootstrap until its completion file is removed', async () => {
		await fs.writeFile(path.join(root, 'AGENTS.md'), '# Agent rules');
		await fs.writeFile(path.join(root, 'BOOTSTRAP.md'), '# Bootstrap questions');
		await fs.writeFile(path.join(root, 'IDENTITY.md'), '# Identity');
		await fs.writeFile(path.join(root, 'SOUL.md'), '# Soul');
		await fs.writeFile(path.join(root, 'USER.md'), '- **Name:** Alice');
		await fs.writeFile(path.join(root, 'MEMORY.md'), '- Prefers concise answers');

		const bootstrapPrompt = await buildSystemPrompt({ location: root });
		expect(bootstrapPrompt).toContain('# Agent rules');
		expect(bootstrapPrompt).toContain('# Identity');
		expect(bootstrapPrompt).toContain('# Soul');
		expect(bootstrapPrompt).toContain('- **Name:** Alice');
		expect(bootstrapPrompt).toContain('- Prefers concise answers');
		expect(bootstrapPrompt).toContain('# Bootstrap questions');

		await fs.rm(path.join(root, 'BOOTSTRAP.md'));
		const profilePrompt = await buildSystemPrompt({ location: root });
		expect(profilePrompt).not.toContain('# Bootstrap questions');
	});

	it('adds loaded skills to a custom subagent prompt', async () => {
		const prompt = await buildSystemPrompt(
			{ location: root },
			[],
			[{ name: 'Writer', content: 'Follow this workflow.' }],
			'Subagent rules'
		);

		expect(prompt).toContain('Subagent rules');
		expect(prompt).toContain('## Agent filesystem');
		expect(prompt).toContain('### Loaded skill: "Writer"');
		expect(prompt).toContain('Follow this workflow.');
		expect(prompt).not.toContain('You are a personal AI assistant.');
	});

	it('ships bootstrap instructions that reference available tools', async () => {
		const prompt = await buildSystemPrompt({ location: root });

		expect(prompt).toContain('call `complete_bootstrap`');
		expect(prompt).not.toContain('startup_files');
	});

	it('marks workspace files as user-controlled context', async () => {
		const prompt = await buildSystemPrompt({ location: root });

		expect(prompt).toContain('editable, user-controlled local files');
		expect(prompt).toContain('does not override the agent acceptance contract');
	});
});
