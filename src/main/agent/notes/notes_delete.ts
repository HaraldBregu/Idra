import fs from 'node:fs';
import type { Config } from '../types';
import { noteFilePath } from './notes_file_path';
import { readNotesSettings } from './notes_read_settings';
import { writeNotesSettings } from './notes_write_settings';

export function deleteNote(config: Config, id: string): boolean {
	const settings = readNotesSettings(config);
	if (!settings.notes[id]) return false;
	fs.rmSync(noteFilePath(config, id), { force: true });
	delete settings.notes[id];
	writeNotesSettings(config, settings);
	return true;
}
