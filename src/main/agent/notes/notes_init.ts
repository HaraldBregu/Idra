import fs from 'node:fs';
import type { Config } from '../types';
import { notesSettingsPath } from './notes_settings_path';
import { writeNotesSettings } from './notes_write_settings';

export function initNotes(config: Config): void {
	if (fs.existsSync(notesSettingsPath(config))) return;
	writeNotesSettings(config, { notes: {} });
}
