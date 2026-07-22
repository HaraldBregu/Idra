import fs from 'node:fs';
import type { Config } from '../types';
import { noteFilePath } from './notes_file_path';
import { readNotesSettings } from './notes_read_settings';
import type { Note } from './notes_types';

export function readNote(config: Config, id: string): Note | undefined {
	const entry = readNotesSettings(config).notes[id];
	if (!entry) return undefined;
	const filePath = noteFilePath(config, id);
	if (!fs.existsSync(filePath)) return undefined;
	return { id, content: fs.readFileSync(filePath, 'utf8'), ...entry };
}
