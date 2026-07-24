import { notes } from './notes_data';

export function deleteNote(id: string): boolean {
	if (!notes[id]) return false;
	delete notes[id];
	return true;
}
