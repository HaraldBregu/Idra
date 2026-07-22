import fs from 'node:fs';
import type { Config } from '../types';
import { noteFilePath } from './notes_file_path';
import { readNotesSettings } from './notes_read_settings';
import type { Note } from './notes_types';

export function searchNotes(config: Config, query: string): Note[] {
	const wanted = query.trim().toLowerCase();
	if (!wanted) return [];
	const matches: Note[] = [];
	for (const [id, entry] of Object.entries(readNotesSettings(config).notes)) {
		const filePath = noteFilePath(config, id);
		if (!fs.existsSync(filePath)) continue;
		const content = fs.readFileSync(filePath, 'utf8');
		if (
			!entry.title.toLowerCase().includes(wanted) &&
			!content.toLowerCase().includes(wanted) &&
			!JSON.stringify(entry.metadata).toLowerCase().includes(wanted)
		)
			continue;
		matches.push({ id, content, ...entry });
	}
	return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
