import path from 'node:path';

export function widgetPreloadPath(): string {
	return path.resolve(__dirname, '../preload/widget_index.js');
}
