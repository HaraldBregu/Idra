import { existsSync, readdirSync, statSync } from 'node:fs';
import { widgetEntryPath } from './widget_entry';
import { isWidgetId } from './widget_id';
import { readWidgetManifest } from './widget_read';
import { widgetsRoot } from './widget_root';
import { readWidgetSettings } from './widget_settings_read';
import type { Widget } from './widget_types';

export function listWidgets(appLocation?: string): Widget[] {
	if (!readWidgetSettings(appLocation).enabled) return [];
	const root = widgetsRoot(appLocation);
	if (!existsSync(root)) return [];
	const widgets: Widget[] = [];
	const directories = readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && isWidgetId(entry.name))
		.sort((left, right) => left.name.localeCompare(right.name));
	for (const directory of directories) {
		const manifest = readWidgetManifest(directory.name, appLocation);
		if (!manifest) continue;
		const entry = widgetEntryPath(directory.name, manifest.metadata.entry, appLocation);
		try {
			if (!statSync(entry).isFile()) continue;
		} catch {
			continue;
		}
		widgets.push({ id: directory.name, ...manifest });
	}
	return widgets;
}
