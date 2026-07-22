import type { BrowserWindow } from 'electron';
import type { WindowFactory } from './window_factory';

export class Widget {
	private readonly windows = new Set<BrowserWindow>();

	constructor(private readonly windowFactory: WindowFactory) {}

	private render(file: string, title: string): BrowserWindow {
		const win = this.windowFactory.create(
			{
				width: 820,
				height: 640,
				minWidth: 620,
				minHeight: 480,
				resizable: true,
				title,
				autoHideMenuBar: true,
				backgroundColor: '#f5f5f2',
			},
			{ file: `widgets/${file}` }
		);

		this.windows.add(win);
		win.setMenuBarVisibility(false);
		win.once('ready-to-show', () => win.show());
		win.on('closed', () => this.windows.delete(win));
		return win;
	}

	renderNotes(): BrowserWindow {
		return this.render('notes.html', 'Notes');
	}

	renderProject(): BrowserWindow {
		return this.render('project.html', 'Project');
	}
}
