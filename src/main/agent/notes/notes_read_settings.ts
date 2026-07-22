import fs from 'node:fs';
import type { Config } from '../types';
import { notesSettingsPath } from './notes_settings_path';
import type { NotesSettings } from './notes_types';

export function readNotesSettings(config: Config): NotesSettings {
	const filePath = notesSettingsPath(config);
	if (!fs.existsSync(filePath)) return { notes: {} };
	const settings = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<NotesSettings>;
	return settings.notes && typeof settings.notes === 'object' ? { notes: settings.notes } : { notes: {} };
}
