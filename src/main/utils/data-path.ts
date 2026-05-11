import { app } from 'electron';
import path from 'node:path';

const DATA_ROOT_NAME = 'FridayData';

export function getDefaultDataDirectory(...segments: string[]): string {
	return path.join(app.getPath('home'), DATA_ROOT_NAME, ...segments);
}
