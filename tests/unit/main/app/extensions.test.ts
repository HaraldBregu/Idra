import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../../../../src/main/window_factory';
import {
	ensureExtensions,
	listExtensions,
	loadExtension,
	readExtensionSettings,
	storeExtensionSettings,
} from '../../../../src/main/extensions/extension_index';
import { extensionEntryPath } from '../../../../src/main/extensions/extension_entry';
import { extensionManifestPath } from '../../../../src/main/extensions/extension_manifest';
import { extensionsSettingsPath } from '../../../../src/main/extensions/extension_settings';
import type { ExtensionManifest } from '../../../../src/main/extensions/extension_types';

function createWindowHarness() {
	const handlers = new Map<string, () => void>();
	const win = {
		focus: jest.fn(),
		isDestroyed: jest.fn(() => false),
		isMinimized: jest.fn(() => false),
		isVisible: jest.fn(() => true),
		restore: jest.fn(),
		setMenuBarVisibility: jest.fn(),
		show: jest.fn(),
		once: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
		on: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
	} as unknown as BrowserWindow;
	const create = jest.fn(() => win);
	const windowFactory = { create } as unknown as WindowFactory;
	return { create, handlers, win, windowFactory };
}

function installExtension(
	appLocation: string,
	id: string,
	manifest: ExtensionManifest,
	contents = '<h1>Extension</h1>'
): string {
	const entry = extensionEntryPath(id, manifest.metadata.entry, appLocation);
	fs.mkdirSync(path.dirname(entry), { recursive: true });
	fs.writeFileSync(entry, contents);
	fs.writeFileSync(extensionManifestPath(id, appLocation), JSON.stringify(manifest));
	return entry;
}

describe('extension storage and loading', () => {
	let appLocation: string;
	const projectManifest: ExtensionManifest = {
		title: 'Project',
		description: 'A compact project board for tracking work from backlog to completion.',
		metadata: {
			version: '1.0.0',
			category: 'project-management',
			entry: 'index.html',
		},
	};

	beforeEach(() => {
		appLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-extensions-'));
	});

	afterEach(() => {
		fs.rmSync(appLocation, { recursive: true, force: true });
	});

	it('initializes settings with only the enabled property', () => {
		expect(ensureExtensions(appLocation)).toEqual([]);
		expect(JSON.parse(fs.readFileSync(extensionsSettingsPath(appLocation), 'utf8'))).toEqual({
			enabled: true,
		});
		expect(fs.readdirSync(path.join(appLocation, 'extensions'))).toEqual(['settings.json']);
	});

	it('stores and reads only the enabled extension setting', () => {
		storeExtensionSettings({ enabled: false }, appLocation);

		expect(readExtensionSettings(appLocation)).toEqual({ enabled: false });
		expect(JSON.parse(fs.readFileSync(extensionsSettingsPath(appLocation), 'utf8'))).toEqual({
			enabled: false,
		});
	});

	it('removes legacy catalog data while preserving the enabled setting', () => {
		fs.mkdirSync(path.dirname(extensionsSettingsPath(appLocation)), { recursive: true });
		fs.writeFileSync(
			extensionsSettingsPath(appLocation),
			JSON.stringify({ enabled: false, extensions: [{ id: 'project' }] })
		);

		expect(ensureExtensions(appLocation)).toEqual([]);
		expect(JSON.parse(fs.readFileSync(extensionsSettingsPath(appLocation), 'utf8'))).toEqual({
			enabled: false,
		});
	});

	it('discovers extension folders from their manifests', () => {
		installExtension(appLocation, 'project', projectManifest);

		expect(listExtensions(appLocation)).toEqual([{ id: 'project', ...projectManifest }]);
	});

	it('uses metadata.entry and preserves additional metadata', () => {
		const manifest: ExtensionManifest = {
			...projectManifest,
			metadata: {
				...projectManifest.metadata,
				entry: 'pages/project.html',
				author: 'Friday',
			},
		};
		installExtension(appLocation, 'project', manifest);

		expect(listExtensions(appLocation)).toEqual([{ id: 'project', ...manifest }]);
	});

	it('sorts discovered extensions by folder name', () => {
		installExtension(appLocation, 'weather', { ...projectManifest, title: 'Weather' });
		installExtension(appLocation, 'clock', { ...projectManifest, title: 'Clock' });

		expect(listExtensions(appLocation).map(({ id }) => id)).toEqual(['clock', 'weather']);
	});

	it('returns no extensions when extensions are disabled', () => {
		installExtension(appLocation, 'project', projectManifest);
		storeExtensionSettings({ enabled: false }, appLocation);

		expect(listExtensions(appLocation)).toEqual([]);
	});

	it('omits folders whose manifest is missing or invalid', () => {
		const entry = extensionEntryPath('notes', 'index.html', appLocation);
		fs.mkdirSync(path.dirname(entry), { recursive: true });
		fs.writeFileSync(entry, '<h1>Notes</h1>');
		expect(listExtensions(appLocation)).toEqual([]);

		fs.writeFileSync(
			extensionManifestPath('notes', appLocation),
			JSON.stringify({ name: 'Notes', description: 'Old schema', metadata: {} })
		);
		expect(listExtensions(appLocation)).toEqual([]);
	});

	it('omits extensions whose manifest entry is missing or unsafe', () => {
		fs.mkdirSync(path.dirname(extensionManifestPath('missing', appLocation)), { recursive: true });
		fs.writeFileSync(extensionManifestPath('missing', appLocation), JSON.stringify(projectManifest));
		fs.mkdirSync(path.dirname(extensionManifestPath('unsafe', appLocation)), { recursive: true });
		fs.writeFileSync(
			extensionManifestPath('unsafe', appLocation),
			JSON.stringify({
				...projectManifest,
				metadata: { ...projectManifest.metadata, entry: '../outside.html' },
			})
		);

		expect(listExtensions(appLocation)).toEqual([]);
	});

	it('loads the manifest entry in a standalone window using its title', () => {
		const manifest: ExtensionManifest = {
			...projectManifest,
			metadata: { ...projectManifest.metadata, entry: 'pages/project.html' },
		};
		const entry = installExtension(appLocation, 'project', manifest);
		const extension = { id: 'project', ...manifest };
		const { create, handlers, win, windowFactory } = createWindowHarness();

		expect(loadExtension(windowFactory, extension, appLocation)).toBe(win);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Project',
				resizable: true,
				webPreferences: { preload: undefined },
			}),
			{ file: entry }
		);

		handlers.get('ready-to-show')?.();
		expect(win.show).toHaveBeenCalledTimes(1);
	});

	it('does not open a window when the manifest entry is missing', () => {
		const extension = { id: 'project', ...projectManifest };
		const { create, windowFactory } = createWindowHarness();

		expect(() => loadExtension(windowFactory, extension, appLocation)).toThrow(
			'Extension entry not found: project'
		);
		expect(create).not.toHaveBeenCalled();
	});

	it('reuses an already-open extension window instead of creating another', () => {
		const manifest: ExtensionManifest = {
			...projectManifest,
			metadata: { ...projectManifest.metadata, entry: 'pages/project.html' },
		};
		installExtension(appLocation, 'project', manifest);
		const extension = { id: 'project', ...manifest };
		const { create, handlers, win, windowFactory } = createWindowHarness();

		const firstWindow = loadExtension(windowFactory, extension, appLocation);
		expect(firstWindow).toBe(win);
		expect(create).toHaveBeenCalledTimes(1);

		handlers.get('ready-to-show')?.();
		win.show.mockClear();
		win.focus.mockClear();

		const secondWindow = loadExtension(windowFactory, extension, appLocation);
		expect(secondWindow).toBe(win);
		expect(create).toHaveBeenCalledTimes(1);
		expect(win.focus).toHaveBeenCalledTimes(1);
		expect(win.show).toHaveBeenCalledTimes(0);
		expect(win.isDestroyed).toHaveBeenCalledTimes(1);
		expect(win.isMinimized).toHaveBeenCalledTimes(1);
		expect(win.isVisible).toHaveBeenCalledTimes(1);
	});

	it('rejects extension paths outside the extensions folder', () => {
		expect(() => extensionEntryPath('../outside', 'index.html', appLocation)).toThrow(
			'Invalid extension id'
		);
		expect(() => extensionEntryPath('project', '../outside.html', appLocation)).toThrow(
			'Invalid extension entry'
		);
	});
});
