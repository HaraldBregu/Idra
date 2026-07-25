import { randomUUID } from 'node:crypto';
import { readNotes } from './notes_read';
import { writeNotes } from './notes_write';
import type { Note, NoteInput } from '../../shared/notes_types';

export async function createNote(input: NoteInput = {}): Promise<Note> {
	const note: Note = {
		id: randomUUID(),
		title: input.title ?? 'Untitled',
		content: input.content ?? '',
		metadata: input.metadata ?? {},
		updatedAt: new Date().toISOString(),
	};
	await writeNotes([note, ...(await readNotes())]);
	return note;
}
