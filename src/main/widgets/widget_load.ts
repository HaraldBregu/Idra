import { existsSync } from 'node:fs';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../app/window_factory';
import { widgetEntryPath } from './widget_entry';
import { render } from './widget_render';
import type { Widget } from './widget_types';

export function loadWidget(
	windowFactory: WindowFactory,
	widget: Widget,
	appLocation?: string
): BrowserWindow {
	const entry = widgetEntryPath(widget.id, widget.metadata.entry, appLocation);
	if (!existsSync(entry)) throw new Error(`Widget entry not found: ${widget.id}`);
	return render(windowFactory, entry, widget.title, widget.id);
}
