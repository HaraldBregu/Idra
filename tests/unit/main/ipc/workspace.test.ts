import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { resolveWorkspaceFile } from '../../../../src/main/ipc/workspace';
import { workspaceFileType } from '../../../../src/shared/workspace';

describe('workspace files', () => {
	it('classifies editable documents and previewable assets', () => {
		expect(workspaceFileType('notes/idea.md')).toEqual({
			kind: 'markdown',
			mimeType: 'text/markdown',
		});
		expect(workspaceFileType('images/photo.webp')).toEqual({
			kind: 'image',
			mimeType: 'image/webp',
		});
		expect(workspaceFileType('audio/theme.mp3')).toEqual({
			kind: 'audio',
			mimeType: 'audio/mpeg',
		});
		expect(workspaceFileType('video/demo.mp4')).toEqual({
			kind: 'video',
			mimeType: 'video/mp4',
		});
		expect(workspaceFileType('docs/manual.pdf')).toEqual({
			kind: 'pdf',
			mimeType: 'application/pdf',
		});
		expect(workspaceFileType('archive.zip')).toEqual({ kind: 'unsupported' });
	});

	it('resolves existing files inside the real workspace', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-workspace-'));
		const directory = path.join(root, 'notes');
		const file = path.join(directory, 'idea.md');
		await fs.mkdir(directory);
		await fs.writeFile(file, '# Idea');

		await expect(resolveWorkspaceFile(root, 'notes/idea.md')).resolves.toBe(file);
		await fs.rm(root, { recursive: true });
	});

	it('rejects traversal and symlink escapes', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-workspace-'));
		const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-outside-'));
		const outsideFile = path.join(outside, 'private.md');
		await fs.writeFile(outsideFile, '# Private');
		await fs.symlink(outsideFile, path.join(root, 'linked.md'));

		await expect(resolveWorkspaceFile(root, '../private.md')).rejects.toThrow(
			'outside workspace'
		);
		await expect(resolveWorkspaceFile(root, 'linked.md')).rejects.toThrow('outside workspace');
		await fs.rm(root, { recursive: true });
		await fs.rm(outside, { recursive: true });
	});
});
