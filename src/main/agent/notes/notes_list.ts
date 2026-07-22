import type { Config } from '../types';
import { readNote } from './notes_read';
import { readNotesSettings } from './notes_read_settings';
import type { Note } from './notes_types';

export function listNotes(config: Config): Note[] {
	const notes: Note[] = [];
	for (const id of Object.keys(readNotesSettings(config).notes)) {
		const note = readNote(config, id);
		if (note) notes.push(note);
	}
	return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
