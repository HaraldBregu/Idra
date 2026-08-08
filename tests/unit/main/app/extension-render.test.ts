import type { BrowserWindow, WebContentsView } from 'electron';
import { render } from '../../../../src/main/extensions/extension_render';
import type { WindowFactory } from '../../../../src/main/window_factory';

describe('extension renderer', () => {
	it('places extension content below the host titlebar', () => {
		const handlers = new Map<string, () => void>();
		const shellWebContents = {
			isDestroyed: jest.fn(() => false),
			on: jest.fn(),
			send: jest.fn(),
		};
		const viewWebContents = {
			close: jest.fn(),
			isDestroyed: jest.fn(() => false),
			on: jest.fn(),
			send: jest.fn(),
		};
		const view = {
			setBounds: jest.fn(),
			webContents: viewWebContents,
		} as unknown as WebContentsView;
		const win = {
			contentView: { addChildView: jest.fn() },
			getContentBounds: jest.fn(() => ({ x: 0, y: 0, width: 820, height: 640 })),
			setMenuBarVisibility: jest.fn(),
			once: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
			on: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
			show: jest.fn(),
			webContents: shellWebContents,
		} as unknown as BrowserWindow;
		const create = jest.fn(() => win);
		const createView = jest.fn(() => view);
		const windowFactory = { create, createView } as unknown as WindowFactory;

		expect(render(windowFactory, '/extension/index.html', 'Project', 'project-shell')).toBe(win);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({ frame: false, resizable: true, title: 'Project' }),
			{ html: 'extension.html', hash: 'extension/Project' }
		);
		expect(createView).toHaveBeenCalledWith('/extension/index.html');
		expect(win.contentView.addChildView).toHaveBeenCalledWith(view);
		expect(view.setBounds).toHaveBeenCalledWith({ x: 0, y: 48, width: 820, height: 592 });

		handlers.get('ready-to-show')?.();
		expect(win.show).toHaveBeenCalledTimes(1);
		handlers.get('closed')?.();
		expect(viewWebContents.close).toHaveBeenCalledTimes(1);
	});
});
