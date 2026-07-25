import fs from 'node:fs/promises';
import { notesPath } from './notes_path';
import type { Note } from '../../shared/notes_types';

/** Every stored note, newest first. Missing or unreadable files read as empty. */
export async function readNotes(): Promise<Note[]> {
	let raw: string;
	try {
		raw = await fs.readFile(notesPath(), 'utf8');
	} catch {
		return [];
	}
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as Note[]) : [];
	} catch {
		return [];
	}
}
