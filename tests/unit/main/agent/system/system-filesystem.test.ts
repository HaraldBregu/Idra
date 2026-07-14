import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

jest.mock('../../../../../src/main/agent/skills', () => ({
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

	it('lists every file and folder as sorted paths relative to the agent root', async () => {
		await fs.mkdir(path.join(root, 'library', 'archive'), { recursive: true });
		await fs.writeFile(path.join(root, 'library', 'image.jpeg'), 'image-content');
		await fs.writeFile(path.join(root, 'library', 'archive', 'notes.txt'), 'private-content');
		await fs.writeFile(path.join(root, 'notes.txt'), 'root-content');

		const prompt = await addFilesystemPrompt({ location: root }, 'base');
		const inventory = prompt.split('\n').filter((line) => line.startsWith('- "'));

		expect(prompt).toContain('## Agent filesystem');
		expect(prompt).toContain(`Root directory: ${JSON.stringify(root)}`);
		expect(inventory).toEqual([
			'- "library/"',
			'- "library/archive/"',
			'- "library/archive/notes.txt"',
			'- "library/image.jpeg"',
			'- "notes.txt"',
		]);
		expect(prompt).not.toContain('image-content');
		expect(prompt).not.toContain('private-content');
		expect(prompt).not.toContain('root-content');
	});

	it('reflects filesystem changes each time the prompt is built', async () => {
		await fs.mkdir(path.join(root, 'library'));

		const before = await addFilesystemPrompt({ location: root }, 'base');
		await fs.writeFile(path.join(root, 'library', 'new.mp3'), 'audio');
		const afterCreate = await addFilesystemPrompt({ location: root }, 'base');
		await fs.rm(path.join(root, 'library', 'new.mp3'));
		const afterDelete = await addFilesystemPrompt({ location: root }, 'base');

		expect(before).not.toContain('library/new.mp3');
		expect(afterCreate).toContain('- "library/new.mp3"');
		expect(afterDelete).not.toContain('library/new.mp3');
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
		expect(prompt).toContain('- "library/clip.mp4"');
	});
});
