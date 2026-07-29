import { existsSync } from 'node:fs';
import type { BrowserWindow } from 'electron';
import type { WindowFactory } from '../app/window_factory';
import { widgetEntryPath } from './widget_entry';
import { render } from './widget_render';
import type { Widget } from './widget_types';
import type { PluginRepository } from '../plugin';

export function loadWidget(
	windowFactory: WindowFactory,
	widget: Widget,
	appLocation?: string,
	pluginRepository?: PluginRepository
): BrowserWindow {
	const entry = widget.source
		? pluginRepository?.resolveWidgetEntry(widget.source)
		: widgetEntryPath(widget.id, widget.metadata.entry, appLocation);
	if (!entry) throw new Error(`Plugin repository is required to load widget: ${widget.id}`);
	if (!existsSync(entry)) throw new Error(`Widget entry not found: ${widget.id}`);
	return render(windowFactory, entry, widget.title, Boolean(widget.source));
}
