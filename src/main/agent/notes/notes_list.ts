import { notes } from './notes_data';
import type { Note } from './notes_types';

export function listNotes(): Note[] {
	return Object.values(notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
