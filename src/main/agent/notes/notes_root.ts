import path from 'node:path';
import type { Config } from '../types';

export function notesRoot(config: Config): string {
	return path.resolve(config.location, 'notes');
}
