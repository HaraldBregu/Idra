import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readWorkspaceAsset } from '../../../../src/main/ipc/asset';
import { deleteWorkspaceFile } from '../../../../src/main/ipc/delete';
import { writeWorkspaceMarkdown } from '../../../../src/main/ipc/markdown';
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
		const dottedFile = path.join(root, '..notes.md');
		await fs.mkdir(directory);
		await fs.writeFile(file, '# Idea');
		await fs.writeFile(dottedFile, '# Dotted');

		await expect(resolveWorkspaceFile(root, 'notes/idea.md')).resolves.toBe(
			await fs.realpath(file)
		);
		await expect(resolveWorkspaceFile(root, '..notes.md')).resolves.toBe(
			await fs.realpath(dottedFile)
		);
		await fs.rm(root, { recursive: true });
	});

	it('rejects traversal and symlink escapes', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-workspace-'));
		const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-outside-'));
		const outsideFile = path.join(outside, 'private.md');
		await fs.writeFile(outsideFile, '# Private');
		await fs.symlink(outsideFile, path.join(root, 'linked.md'));

		await expect(resolveWorkspaceFile(root, '../private.md')).rejects.toThrow('outside workspace');
		await expect(resolveWorkspaceFile(root, 'linked.md')).rejects.toThrow('outside workspace');
		await fs.rm(root, { recursive: true });
		await fs.rm(outside, { recursive: true });
	});

	it('writes Markdown and reads typed binary assets', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-workspace-'));
		const markdown = path.join(root, 'notes.md');
		const text = path.join(root, 'notes.txt');
		const image = path.join(root, 'photo.png');
		const directory = path.join(root, 'folder');
		await fs.writeFile(markdown, '# Before');
		await fs.writeFile(text, 'Before');
		await fs.writeFile(image, new Uint8Array([1, 2, 3]));
		await fs.mkdir(directory);

		await writeWorkspaceMarkdown(root, 'notes.md', '# After');
		await expect(fs.readFile(markdown, 'utf8')).resolves.toBe('# After');
		await expect(writeWorkspaceMarkdown(root, 'notes.txt', 'After')).rejects.toThrow(
			'Only Markdown'
		);
		await expect(readWorkspaceAsset(root, 'photo.png')).resolves.toEqual({
			mimeType: 'image/png',
			data: new Uint8Array([1, 2, 3]),
		});
		await expect(readWorkspaceAsset(root, 'notes.txt')).rejects.toThrow('supported asset');
		await deleteWorkspaceFile(root, 'notes.txt');
		await expect(fs.stat(text)).rejects.toThrow();
		await expect(deleteWorkspaceFile(root, 'folder')).rejects.toThrow('not a file');
		await fs.rm(root, { recursive: true });
	});
});
