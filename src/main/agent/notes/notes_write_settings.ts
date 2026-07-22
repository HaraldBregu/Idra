import fs from 'node:fs';
import type { Config } from '../types';
import { notesRoot } from './notes_root';
import { notesSettingsPath } from './notes_settings_path';
import type { NotesSettings } from './notes_types';

export function writeNotesSettings(config: Config, settings: NotesSettings): void {
	fs.mkdirSync(notesRoot(config), { recursive: true });
	fs.writeFileSync(notesSettingsPath(config), `${JSON.stringify(settings, null, '\t')}\n`, 'utf8');
}
