import { readNotes } from './notes_read';
import { writeNotes } from './notes_write';
import type { Note, NoteInput } from '../../shared/notes_types';

export async function updateNote(id: string, updates: NoteInput): Promise<Note | undefined> {
	let updated: Note | undefined;
	const notes = (await readNotes()).map((note) => {
		if (note.id !== id) return note;
		updated = { ...note, ...updates, updatedAt: new Date().toISOString() };
		return updated;
	});
	if (updated) await writeNotes(notes);
	return updated;
}
