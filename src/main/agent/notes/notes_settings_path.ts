import path from 'node:path';
import type { Config } from '../types';
import { notesRoot } from './notes_root';

export function notesSettingsPath(config: Config): string {
	return path.join(notesRoot(config), 'settings.json');
}
