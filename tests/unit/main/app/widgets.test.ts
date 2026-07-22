import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../../../../src/main/app/window_factory';
import {
	ensureWidgets,
	listWidgets,
	loadWidget,
	storeWidgets,
} from '../../../../src/main/widgets';
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
		const widgets = [
			{ id: 'notes', name: 'Notes' },
			{ id: 'project', name: 'Project' },
		];

		storeWidgets(widgets, appLocation);

		expect(widgetsSettingsPath(appLocation)).toBe(
			path.join(appLocation, 'widgets', 'settings.json')
		);
		expect(listWidgets(appLocation)).toEqual(widgets);
	});

	it('installs default pages into one folder per widget without overwriting them', () => {
		const templates = path.join(appLocation, 'templates');
		const notesTemplate = path.join(templates, 'notes.html');
		const projectTemplate = path.join(templates, 'project.html');
		fs.mkdirSync(templates);
		fs.writeFileSync(notesTemplate, '<h1>Notes</h1>');
		fs.writeFileSync(projectTemplate, '<h1>Project</h1>');

		const widgets = ensureWidgets(appLocation, {
			notes: notesTemplate,
			project: projectTemplate,
		});

		expect(widgets).toEqual([
			{ id: 'notes', name: 'Notes' },
			{ id: 'project', name: 'Project' },
		]);
		expect(fs.readFileSync(widgetPagePath('notes', appLocation), 'utf8')).toBe(
			'<h1>Notes</h1>'
		);
		expect(fs.readFileSync(widgetPagePath('project', appLocation), 'utf8')).toBe(
			'<h1>Project</h1>'
		);

		fs.writeFileSync(widgetPagePath('notes', appLocation), '<h1>Custom Notes</h1>');
		ensureWidgets(appLocation, { notes: notesTemplate, project: projectTemplate });
		expect(fs.readFileSync(widgetPagePath('notes', appLocation), 'utf8')).toBe(
			'<h1>Custom Notes</h1>'
		);
	});

	it('filters invalid widget configurations when retrieving the list', () => {
		fs.mkdirSync(path.dirname(widgetsSettingsPath(appLocation)), { recursive: true });
		fs.writeFileSync(
			widgetsSettingsPath(appLocation),
			JSON.stringify({
				widgets: [
					{ id: 'notes', name: 'Notes' },
					{ id: '../outside', name: 'Unsafe' },
					{ id: 'missing-name' },
				],
			})
		);

		expect(listWidgets(appLocation)).toEqual([{ id: 'notes', name: 'Notes' }]);
	});

	it('loads a retrieved widget page in a standalone window', () => {
		const widget = { id: 'notes', name: 'Notes' };
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
