import fs from 'node:fs/promises';
import { notesPath } from './notes_path';
import type { Note } from '../../shared/notes_types';

export async function writeNotes(notes: Note[]): Promise<void> {
	await fs.writeFile(notesPath(), JSON.stringify(notes, null, 2), 'utf8');
}
