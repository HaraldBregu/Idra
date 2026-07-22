import fs from 'node:fs';
import type { Config } from '../types';
import { noteFilePath } from './notes_file_path';
import { readNote } from './notes_read';
import { readNotesSettings } from './notes_read_settings';
import type { Note, UpdateNoteInput } from './notes_types';
import { writeNotesSettings } from './notes_write_settings';

export function updateNote(config: Config, id: string, updates: UpdateNoteInput): Note | undefined {
	const current = readNote(config, id);
	if (!current) return undefined;
	const note: Note = {
		...current,
		title: updates.title?.trim() ?? current.title,
		content: updates.content ?? current.content,
		metadata: updates.metadata ?? current.metadata,
		updatedAt: new Date().toISOString(),
	};
	if (updates.content !== undefined) fs.writeFileSync(noteFilePath(config, id), note.content, 'utf8');
	const settings = readNotesSettings(config);
	settings.notes[id] = {
		title: note.title,
		createdAt: note.createdAt,
		updatedAt: note.updatedAt,
		metadata: note.metadata,
	};
	writeNotesSettings(config, settings);
	return note;
}
