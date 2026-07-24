import { randomUUID } from 'node:crypto';
import { notes } from './notes_data';
import type { CreateNoteInput, Note } from './notes_types';

export function createNote(input: CreateNoteInput): Note {
	const now = new Date().toISOString();
	const note: Note = {
		id: randomUUID(),
		title: input.title.trim(),
		content: input.content,
		createdAt: now,
		updatedAt: now,
		metadata: input.metadata ?? {},
	};
	notes[note.id] = note;
	return note;
}
