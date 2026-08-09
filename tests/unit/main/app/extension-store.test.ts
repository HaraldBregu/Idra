import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ExtensionStorage } from '../../../../src/main/extensions/extension_store';

describe('extension storage', () => {
	let root: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-extension-store-'));
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('isolates JSON values by extension ID', () => {
		const storage = new ExtensionStorage(root);
		expect(storage.get('draw', 'config')).toBeUndefined();

		storage.set('draw', 'config', { color: 'blue', size: 2 });
		storage.set('demo', 'config', { color: 'red' });

		expect(storage.get('draw', 'config')).toEqual({ color: 'blue', size: 2 });
		expect(storage.get('demo', 'config')).toEqual({ color: 'red' });
		storage.delete('draw', 'config');
		storage.delete('draw', 'missing');
		expect(storage.get('draw', 'config')).toBeUndefined();
	});

	it('rejects invalid keys and values', () => {
		const storage = new ExtensionStorage(root);
		expect(() => storage.set('draw', '', 'value')).toThrow('store key');
		expect(() => storage.set('draw', 'value', Number.NaN)).toThrow('store value');
		expect(() => storage.set('../draw', 'value', true)).toThrow('Invalid extension ID');
	});

	it('round-trips, overwrites, and deletes nested binary files', async () => {
		const storage = new ExtensionStorage(root);
		await storage.writeFile('draw', 'scenes/current.bin', new Uint8Array([1, 2, 3]));
		expect(await storage.readFile('draw', 'scenes/current.bin')).toEqual(
			new Uint8Array([1, 2, 3])
		);

		await storage.writeFile('draw', 'scenes/current.bin', new Uint8Array([4, 5]));
		expect(await storage.readFile('draw', 'scenes/current.bin')).toEqual(
			new Uint8Array([4, 5])
		);
		await expect(storage.readFile('demo', 'scenes/current.bin')).rejects.toThrow('not found');

		await storage.deleteFile('draw', 'scenes/current.bin');
		await storage.deleteFile('draw', 'scenes/current.bin');
		await expect(storage.readFile('draw', 'scenes/current.bin')).rejects.toThrow('not found');
	});

	it.each(['', '../outside', '/outside', 'nested/../outside', 'nested\\outside'])(
		'rejects unsafe file path %p',
		async (filePath) => {
			const storage = new ExtensionStorage(root);
			await expect(storage.writeFile('draw', filePath, new Uint8Array())).rejects.toThrow(
				'Invalid extension file path'
			);
		}
	);

	it('rejects symlinks inside the files folder', async () => {
		if (process.platform === 'win32') return;
		const storage = new ExtensionStorage(root);
		await storage.writeFile('draw', 'safe/file.bin', new Uint8Array([1]));
		const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-extension-outside-'));
		try {
			fs.rmSync(path.join(root, 'draw', 'files', 'safe'), { recursive: true });
			fs.symlinkSync(outside, path.join(root, 'draw', 'files', 'safe'));
			await expect(storage.readFile('draw', 'safe/file.bin')).rejects.toThrow(
				'Invalid extension storage directory'
			);
			await expect(
				storage.writeFile('draw', 'safe/file.bin', new Uint8Array([2]))
			).rejects.toThrow('Invalid extension storage directory');
		} finally {
			fs.rmSync(outside, { recursive: true, force: true });
		}
	});
});
