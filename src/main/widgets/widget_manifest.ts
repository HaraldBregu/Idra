import path from 'node:path';
import { isWidgetId } from './widget_id';
import { widgetsRoot } from './widget_root';

export function widgetManifestPath(id: string, appLocation?: string): string {
	if (!isWidgetId(id)) throw new Error(`Invalid widget id: ${id}`);
	return path.join(widgetsRoot(appLocation), id, 'manifest.json');
}
