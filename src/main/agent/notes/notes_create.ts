import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import type { Config } from '../types';
import { noteFilePath } from './notes_file_path';
import { readNotesSettings } from './notes_read_settings';
import type { CreateNoteInput, Note } from './notes_types';
import { writeNotesSettings } from './notes_write_settings';

export function createNote(config: Config, input: CreateNoteInput): Note {
	const settings = readNotesSettings(config);
	const id = randomUUID();
	const now = new Date().toISOString();
	const note: Note = {
		id,
		title: input.title.trim(),
		content: input.content,
		createdAt: now,
		updatedAt: now,
		metadata: input.metadata ?? {},
	};
	fs.mkdirSync(noteFilePath(config, id).replace(/[/\\][^/\\]+$/, ''), { recursive: true });
	fs.writeFileSync(noteFilePath(config, id), note.content, 'utf8');
	settings.notes[id] = {
		title: note.title,
		createdAt: note.createdAt,
		updatedAt: note.updatedAt,
		metadata: note.metadata,
	};
	writeNotesSettings(config, settings);
	return note;
}
