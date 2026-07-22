import path from 'node:path';
import { isWidgetId } from './id';
import { widgetsRoot } from './root';

export function widgetPagePath(id: string, appLocation?: string): string {
	if (!isWidgetId(id)) throw new Error(`Invalid widget id: ${id}`);
	return path.join(widgetsRoot(appLocation), id, 'index.html');
}
