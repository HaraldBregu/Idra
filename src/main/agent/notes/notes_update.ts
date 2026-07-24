import { notes } from './notes_data';
import type { Note, UpdateNoteInput } from './notes_types';

export function updateNote(id: string, updates: UpdateNoteInput): Note | undefined {
	const current = notes[id];
	if (!current) return undefined;
	const note: Note = {
		...current,
		title: updates.title?.trim() ?? current.title,
		content: updates.content ?? current.content,
		metadata: updates.metadata ?? current.metadata,
		updatedAt: new Date().toISOString(),
	};
	notes[id] = note;
	return note;
}
