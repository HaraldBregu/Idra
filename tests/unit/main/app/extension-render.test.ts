import type { BrowserWindow } from 'electron';
import { render } from '../../../../src/main/extensions/extension_render';
import type { WindowFactory } from '../../../../src/main/window_factory';

type Handler = (...args: unknown[]) => void;

describe('extension renderer', () => {
	it('loads extension content directly in one native sandboxed window', () => {
		const handlers = new Map<string, Handler>();
		const webContentsHandlers = new Map<string, Handler>();
		const webContents = {
			isDestroyed: jest.fn(() => false),
			on: jest.fn((event: string, handler: Handler) => webContentsHandlers.set(event, handler)),
			send: jest.fn(),
		};
		const win = {
			isDestroyed: jest.fn(() => false),
			setMenuBarVisibility: jest.fn(),
			setTitle: jest.fn(),
			once: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
			on: jest.fn((event: string, handler: Handler) => handlers.set(event, handler)),
			show: jest.fn(),
			webContents,
		} as unknown as BrowserWindow;
		const create = jest.fn(() => win);
		const windowFactory = { create } as unknown as WindowFactory;

		expect(render(windowFactory, '/extension/index.html', 'Project', 'project-shell')).toBe(win);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				frame: true,
				resizable: true,
				title: 'Project',
				transparent: false,
			}),
			{ file: '/extension/index.html' }
		);
		expect(win.setTitle).toHaveBeenCalledWith('Project');

		handlers.get('ready-to-show')?.();
		expect(win.show).toHaveBeenCalledTimes(1);

		const titleEvent = { preventDefault: jest.fn() };
		webContentsHandlers.get('page-title-updated')?.(titleEvent);
		expect(titleEvent.preventDefault).toHaveBeenCalledTimes(1);
		expect(handlers.has('close')).toBe(false);
	});
});
