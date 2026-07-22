import path from 'node:path';
import { isWidgetEntry } from './widget_entry_validate';
import { isWidgetId } from './widget_id';
import { widgetsRoot } from './widget_root';

export function widgetEntryPath(id: string, entry: string, appLocation?: string): string {
	if (!isWidgetId(id)) throw new Error(`Invalid widget id: ${id}`);
	if (!isWidgetEntry(entry)) throw new Error(`Invalid widget entry: ${entry}`);
	return path.join(widgetsRoot(appLocation), id, ...entry.split('/'));
}
