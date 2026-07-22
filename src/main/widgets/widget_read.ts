import { existsSync, readFileSync } from 'node:fs';
import { widgetManifestPath } from './widget_manifest';
import { isWidgetManifest } from './widget_manifest_validate';
import type { WidgetManifest } from './widget_types';

export function readWidgetManifest(id: string, appLocation?: string): WidgetManifest | null {
	const file = widgetManifestPath(id, appLocation);
	if (!existsSync(file)) return null;

	try {
		const manifest = JSON.parse(readFileSync(file, 'utf8')) as unknown;
		return isWidgetManifest(manifest) ? manifest : null;
	} catch {
		return null;
	}
}
