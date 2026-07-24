import { notes } from './notes_data';
import type { Note } from './notes_types';

export function readNote(id: string): Note | undefined {
	return notes[id];
}
