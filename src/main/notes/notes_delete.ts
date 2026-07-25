import { readNotes } from './notes_read';
import { writeNotes } from './notes_write';

export async function deleteNote(id: string): Promise<boolean> {
	const notes = await readNotes();
	const remaining = notes.filter((note) => note.id !== id);
	if (remaining.length === notes.length) return false;
	await writeNotes(remaining);
	return true;
}
