import { readNotes } from './notes_read';
import type { Note } from '../../shared/notes_types';

export async function getNote(id: string): Promise<Note | undefined> {
	return (await readNotes()).find((note) => note.id === id);
}
