import { existsSync } from 'node:fs';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../app/window_factory';
import { widgetPagePath } from './page';
import { render } from './render';
import type { WidgetConfiguration } from './types';

export function loadWidget(
	windowFactory: WindowFactory,
	widget: WidgetConfiguration,
	appLocation?: string
): BrowserWindow {
	const page = widgetPagePath(widget.id, appLocation);
	if (!existsSync(page)) throw new Error(`Widget page not found: ${widget.id}`);
	return render(windowFactory, page, widget.name);
}
