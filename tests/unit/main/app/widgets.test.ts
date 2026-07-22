import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../../../../src/main/app/window_factory';
import {
	ensureWidgets,
	listWidgets,
	loadWidget,
	readWidgetSettings,
	storeWidgetSettings,
} from '../../../../src/main/widgets/widget_index';
import { widgetEntryPath } from '../../../../src/main/widgets/widget_entry';
import { widgetManifestPath } from '../../../../src/main/widgets/widget_manifest';
import { widgetsSettingsPath } from '../../../../src/main/widgets/widget_settings';
import type { WidgetManifest } from '../../../../src/main/widgets/widget_types';

function createWindowHarness() {
	const handlers = new Map<string, () => void>();
	const win = {
		setMenuBarVisibility: jest.fn(),
		show: jest.fn(),
		once: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
		on: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
	} as unknown as BrowserWindow;
	const create = jest.fn(() => win);
	const windowFactory = { create } as unknown as WindowFactory;
	return { create, handlers, win, windowFactory };
}

function installWidget(
	appLocation: string,
	id: string,
	manifest: WidgetManifest,
	contents = '<h1>Widget</h1>'
): string {
	const entry = widgetEntryPath(id, manifest.metadata.entry, appLocation);
	fs.mkdirSync(path.dirname(entry), { recursive: true });
	fs.writeFileSync(entry, contents);
	fs.writeFileSync(widgetManifestPath(id, appLocation), JSON.stringify(manifest));
	return entry;
}

describe('widget storage and loading', () => {
	let appLocation: string;
	const projectManifest: WidgetManifest = {
		title: 'Project',
		description: 'A compact project board for tracking work from backlog to completion.',
		metadata: {
			version: '1.0.0',
			category: 'project-management',
			entry: 'index.html',
		},
	};

	beforeEach(() => {
		appLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-widgets-'));
	});

	afterEach(() => {
		fs.rmSync(appLocation, { recursive: true, force: true });
	});

	it('initializes settings with only the enabled property', () => {
		expect(ensureWidgets(appLocation)).toEqual([]);
		expect(JSON.parse(fs.readFileSync(widgetsSettingsPath(appLocation), 'utf8'))).toEqual({
			enabled: true,
		});
		expect(fs.readdirSync(path.join(appLocation, 'widgets'))).toEqual(['settings.json']);
	});

	it('stores and reads only the enabled widget setting', () => {
		storeWidgetSettings({ enabled: false }, appLocation);

		expect(readWidgetSettings(appLocation)).toEqual({ enabled: false });
		expect(JSON.parse(fs.readFileSync(widgetsSettingsPath(appLocation), 'utf8'))).toEqual({
			enabled: false,
		});
	});

	it('removes legacy catalog data while preserving the enabled setting', () => {
		fs.mkdirSync(path.dirname(widgetsSettingsPath(appLocation)), { recursive: true });
		fs.writeFileSync(
			widgetsSettingsPath(appLocation),
			JSON.stringify({ enabled: false, widgets: [{ id: 'project' }] })
		);

		expect(ensureWidgets(appLocation)).toEqual([]);
		expect(JSON.parse(fs.readFileSync(widgetsSettingsPath(appLocation), 'utf8'))).toEqual({
			enabled: false,
		});
	});

	it('discovers widget folders from their manifests', () => {
		installWidget(appLocation, 'project', projectManifest);

		expect(listWidgets(appLocation)).toEqual([{ id: 'project', ...projectManifest }]);
	});

	it('uses metadata.entry and preserves additional metadata', () => {
		const manifest: WidgetManifest = {
			...projectManifest,
			metadata: {
				...projectManifest.metadata,
				entry: 'pages/project.html',
				author: 'Friday',
			},
		};
		installWidget(appLocation, 'project', manifest);

		expect(listWidgets(appLocation)).toEqual([{ id: 'project', ...manifest }]);
	});

	it('sorts discovered widgets by folder name', () => {
		installWidget(appLocation, 'weather', { ...projectManifest, title: 'Weather' });
		installWidget(appLocation, 'clock', { ...projectManifest, title: 'Clock' });

		expect(listWidgets(appLocation).map(({ id }) => id)).toEqual(['clock', 'weather']);
	});

	it('returns no widgets when widgets are disabled', () => {
		installWidget(appLocation, 'project', projectManifest);
		storeWidgetSettings({ enabled: false }, appLocation);

		expect(listWidgets(appLocation)).toEqual([]);
	});

	it('omits folders whose manifest is missing or invalid', () => {
		const entry = widgetEntryPath('notes', 'index.html', appLocation);
		fs.mkdirSync(path.dirname(entry), { recursive: true });
		fs.writeFileSync(entry, '<h1>Notes</h1>');
		expect(listWidgets(appLocation)).toEqual([]);

		fs.writeFileSync(
			widgetManifestPath('notes', appLocation),
			JSON.stringify({ name: 'Notes', description: 'Old schema', metadata: {} })
		);
		expect(listWidgets(appLocation)).toEqual([]);
	});

	it('omits widgets whose manifest entry is missing or unsafe', () => {
		fs.mkdirSync(path.dirname(widgetManifestPath('missing', appLocation)), { recursive: true });
		fs.writeFileSync(widgetManifestPath('missing', appLocation), JSON.stringify(projectManifest));
		fs.mkdirSync(path.dirname(widgetManifestPath('unsafe', appLocation)), { recursive: true });
		fs.writeFileSync(
			widgetManifestPath('unsafe', appLocation),
			JSON.stringify({
				...projectManifest,
				metadata: { ...projectManifest.metadata, entry: '../outside.html' },
			})
		);

		expect(listWidgets(appLocation)).toEqual([]);
	});

	it('loads the manifest entry in a standalone window using its title', () => {
		const manifest: WidgetManifest = {
			...projectManifest,
			metadata: { ...projectManifest.metadata, entry: 'pages/project.html' },
		};
		const entry = installWidget(appLocation, 'project', manifest);
		const widget = { id: 'project', ...manifest };
		const { create, handlers, win, windowFactory } = createWindowHarness();

		expect(loadWidget(windowFactory, widget, appLocation)).toBe(win);
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
		const widget = { id: 'project', ...projectManifest };
		const { create, windowFactory } = createWindowHarness();

		expect(() => loadWidget(windowFactory, widget, appLocation)).toThrow(
			'Widget entry not found: project'
		);
		expect(create).not.toHaveBeenCalled();
	});

	it('rejects widget paths outside the widgets folder', () => {
		expect(() => widgetEntryPath('../outside', 'index.html', appLocation)).toThrow(
			'Invalid widget id'
		);
		expect(() => widgetEntryPath('project', '../outside.html', appLocation)).toThrow(
			'Invalid widget entry'
		);
	});
});
