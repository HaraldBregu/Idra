import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../../../../src/main/app/window_factory';
import { ensureWidgets, listWidgets, loadWidget, storeWidgets } from '../../../../src/main/widgets';
import { widgetManifestPath } from '../../../../src/main/widgets/widget_manifest';
import { widgetPagePath } from '../../../../src/main/widgets/widget_page';
import { widgetsSettingsPath } from '../../../../src/main/widgets/widget_settings';

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

describe('widget storage and loading', () => {
	let appLocation: string;

	beforeEach(() => {
		appLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-widgets-'));
	});

	afterEach(() => {
		fs.rmSync(appLocation, { recursive: true, force: true });
	});

	it('stores and retrieves widget configurations from widgets/settings.json', () => {
		const configurations = [{ id: 'weather' }, { id: 'clock' }];
		const manifests = [
			{
				name: 'Weather',
				description: 'Local forecast',
				metadata: { version: '1.0.0', author: 'Friday' },
			},
			{
				name: 'World Clock',
				description: 'Times around the world',
				metadata: { version: '2.0.0', zones: 4 },
			},
		];
		for (const [index, configuration] of configurations.entries()) {
			const page = widgetPagePath(configuration.id, appLocation);
			fs.mkdirSync(path.dirname(page), { recursive: true });
			fs.writeFileSync(page, `<h1>${manifests[index].name}</h1>`);
			fs.writeFileSync(
				widgetManifestPath(configuration.id, appLocation),
				JSON.stringify(manifests[index])
			);
		}

		storeWidgets(configurations, appLocation);

		expect(widgetsSettingsPath(appLocation)).toBe(
			path.join(appLocation, 'widgets', 'settings.json')
		);
		expect(JSON.parse(fs.readFileSync(widgetsSettingsPath(appLocation), 'utf8'))).toEqual({
			widgets: configurations,
		});
		expect(listWidgets(appLocation)).toEqual([
			{ id: 'weather', ...manifests[0] },
			{ id: 'clock', ...manifests[1] },
		]);
	});

	it('initializes an empty app-data catalog without installing widget pages', () => {
		expect(ensureWidgets(appLocation)).toEqual([]);
		expect(JSON.parse(fs.readFileSync(widgetsSettingsPath(appLocation), 'utf8'))).toEqual({
			widgets: [],
		});
		expect(fs.readdirSync(path.join(appLocation, 'widgets'))).toEqual(['settings.json']);
	});

	it('filters invalid widget configurations when retrieving the list', () => {
		const notesPage = widgetPagePath('notes', appLocation);
		fs.mkdirSync(path.dirname(notesPage), { recursive: true });
		fs.writeFileSync(notesPage, '<h1>Notes</h1>');
		fs.writeFileSync(
			widgetManifestPath('notes', appLocation),
			JSON.stringify({ name: 'Notes', description: 'Notes demo', metadata: {} })
		);
		fs.mkdirSync(path.dirname(widgetsSettingsPath(appLocation)), { recursive: true });
		fs.writeFileSync(
			widgetsSettingsPath(appLocation),
			JSON.stringify({
				widgets: [{ id: 'notes' }, { id: '../outside' }, {}],
			})
		);

		expect(listWidgets(appLocation)).toEqual([
			{ id: 'notes', name: 'Notes', description: 'Notes demo', metadata: {} },
		]);
	});

	it('omits configured widgets that do not exist under the app-data widgets folder', () => {
		storeWidgets([{ id: 'notes' }], appLocation);
		expect(listWidgets(appLocation)).toEqual([]);
	});

	it('omits widgets whose manifest is missing or invalid', () => {
		const page = widgetPagePath('notes', appLocation);
		fs.mkdirSync(path.dirname(page), { recursive: true });
		fs.writeFileSync(page, '<h1>Notes</h1>');
		storeWidgets([{ id: 'notes' }], appLocation);

		expect(listWidgets(appLocation)).toEqual([]);

		fs.writeFileSync(
			widgetManifestPath('notes', appLocation),
			JSON.stringify({ name: 'Notes', description: 'Missing metadata' })
		);
		expect(listWidgets(appLocation)).toEqual([]);
	});

	it('loads a retrieved widget page in a standalone window', () => {
		const widget = {
			id: 'notes',
			name: 'Notes',
			description: 'Notes demo',
			metadata: { version: '1.0.0' },
		};
		const page = widgetPagePath(widget.id, appLocation);
		fs.mkdirSync(path.dirname(page), { recursive: true });
		fs.writeFileSync(page, '<h1>Notes</h1>');
		const { create, handlers, win, windowFactory } = createWindowHarness();

		expect(loadWidget(windowFactory, widget, appLocation)).toBe(win);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Notes',
				resizable: true,
				webPreferences: { preload: undefined },
			}),
			{ file: page }
		);

		handlers.get('ready-to-show')?.();
		expect(win.show).toHaveBeenCalledTimes(1);
	});

	it('rejects widget paths outside the widgets folder', () => {
		expect(() => widgetPagePath('../outside', appLocation)).toThrow('Invalid widget id');
	});
});
