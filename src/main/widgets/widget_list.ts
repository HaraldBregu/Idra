import { existsSync, readdirSync, statSync } from 'node:fs';
import { widgetEntryPath } from './widget_entry';
import { isWidgetId } from './widget_id';
import { readWidgetManifest } from './widget_read';
import { widgetsRoot } from './widget_root';
import { readWidgetSettings } from './widget_settings_read';
import type { Widget } from './widget_types';
import type { PluginRepository } from '../plugin';

export function listWidgets(
	appLocation?: string,
	pluginRepository?: PluginRepository
): Widget[] {
	if (!readWidgetSettings(appLocation).enabled) return [];
	const root = widgetsRoot(appLocation);
	const widgets: Widget[] = [];
	const directories = existsSync(root)
		? readdirSync(root, { withFileTypes: true })
				.filter((entry) => entry.isDirectory() && isWidgetId(entry.name))
				.sort((left, right) => left.name.localeCompare(right.name))
		: [];
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
	widgets.push(...(pluginRepository?.widgets() ?? []));
	return widgets.sort((left, right) => left.id.localeCompare(right.id));
}
