import { notes } from './notes_data';
import type { Note } from './notes_types';

export function searchNotes(query: string): Note[] {
	const wanted = query.trim().toLowerCase();
	if (!wanted) return [];
	return Object.values(notes)
		.filter(
			(note) =>
				note.title.toLowerCase().includes(wanted) ||
				note.content.toLowerCase().includes(wanted) ||
				JSON.stringify(note.metadata).toLowerCase().includes(wanted)
		)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
