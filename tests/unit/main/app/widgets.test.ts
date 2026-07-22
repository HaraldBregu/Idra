import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../../../../src/main/app/window_factory';
import { renderNotes } from '../../../../src/main/widgets/notes';
import { renderProject } from '../../../../src/main/widgets/project';

function createHarness() {
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

describe('widget renderers', () => {
	it.each([
		['Notes', renderNotes],
		['Project', renderProject],
	])('renders the %s page in a standalone window', (title, renderWidget) => {
		const { create, handlers, win, windowFactory } = createHarness();

		expect(renderWidget(windowFactory)).toBe(win);
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				title,
				resizable: true,
				webPreferences: { preload: undefined },
			}),
			{ file: 'file-mock' }
		);
		expect(win.setMenuBarVisibility).toHaveBeenCalledWith(false);

		handlers.get('ready-to-show')?.();
		expect(win.show).toHaveBeenCalledTimes(1);
	});
});
