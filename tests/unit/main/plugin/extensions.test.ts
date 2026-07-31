import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../../../../src/main/app/window_factory';
import { PluginRepository } from '../../../../src/main/plugin';
import { listExtensions, loadExtension } from '../../../../src/main/extensions/extension_index';

describe('plugin extension integration', () => {
	it('lists and opens plugin extensions in a restricted window', () => {
		const appLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-plugin-extension-'));
		try {
			const pluginDirectory = path.join(appLocation, 'plugins', 'acme-tools');
			const entry = path.join(pluginDirectory, 'extensions', 'dashboard', 'index.html');
			fs.mkdirSync(path.dirname(entry), { recursive: true });
			fs.writeFileSync(entry, '<h1>Dashboard</h1>');
			fs.writeFileSync(
				path.join(pluginDirectory, 'manifest.json'),
				JSON.stringify({
					schemaVersion: 3,
					id: 'acme-tools',
					name: 'Acme Tools',
					version: '1.0.0',
					description: 'Acme dashboard integration.',
					contributes: {
						extensions: [
							{
								id: 'dashboard',
								title: 'Acme Dashboard',
								description: 'Account usage and status.',
								category: 'integration',
								entry: 'extensions/dashboard/index.html',
							},
						],
					},
				})
			);

			const repository = new PluginRepository({ root: path.join(appLocation, 'plugins') });
			const extension = listExtensions(appLocation, repository)[0];
			expect(extension).toEqual(
				expect.objectContaining({
					id: 'acme-tools/dashboard',
					source: { kind: 'plugin', pluginId: 'acme-tools', extensionId: 'dashboard' },
				})
			);

			const win = {
				setMenuBarVisibility: jest.fn(),
				show: jest.fn(),
				once: jest.fn(),
				on: jest.fn(),
			} as unknown as BrowserWindow;
			const create = jest.fn(() => win);
			const windowFactory = { create } as unknown as WindowFactory;

			expect(loadExtension(windowFactory, extension, appLocation, repository)).toBe(win);
			expect(create).toHaveBeenCalledWith(
				expect.objectContaining({
					webPreferences: {
						preload: undefined,
						sandbox: true,
						nodeIntegration: false,
						contextIsolation: true,
						partition: 'friday-plugin-extensions',
					},
				}),
				{ file: fs.realpathSync(entry) }
			);
		} finally {
			fs.rmSync(appLocation, { recursive: true, force: true });
		}
	});
});
