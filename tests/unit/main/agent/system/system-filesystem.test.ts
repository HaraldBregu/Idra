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

	it('includes workspace context and gates bootstrap on the user profile', async () => {
		await fs.writeFile(path.join(root, 'AGENTS.md'), '# Agent rules');
		await fs.writeFile(path.join(root, 'BOOTSTRAP.md'), '# Bootstrap questions');
		await fs.writeFile(path.join(root, 'IDENTITY.md'), '# Identity');
		await fs.writeFile(path.join(root, 'SOUL.md'), '# Soul');
		await fs.writeFile(path.join(root, 'USER.md'), '- **Name:** Alice');
		await fs.writeFile(path.join(root, 'MEMORY.md'), '- Prefers concise answers');

		const profilePrompt = await buildSystemPrompt({ location: root });
		expect(profilePrompt).toContain('# Agent rules');
		expect(profilePrompt).toContain('# Identity');
		expect(profilePrompt).toContain('# Soul');
		expect(profilePrompt).toContain('- **Name:** Alice');
		expect(profilePrompt).toContain('- Prefers concise answers');
		expect(profilePrompt).not.toContain('# Bootstrap questions');

		await fs.writeFile(path.join(root, 'USER.md'), '- **Name:**');
		const bootstrapPrompt = await buildSystemPrompt({ location: root });
		expect(bootstrapPrompt).toContain('# Bootstrap questions');
	});
});
