import type { JsonValue } from 'type-fest';

export type NoteMetadata = Record<string, JsonValue>;

export interface NoteSettingsEntry {
	title: string;
	createdAt: string;
	updatedAt: string;
	metadata: NoteMetadata;
}

export interface NotesSettings {
	notes: Record<string, NoteSettingsEntry>;
}

export interface Note extends NoteSettingsEntry {
	id: string;
	content: string;
}

export interface CreateNoteInput {
	title: string;
	content: string;
	metadata?: NoteMetadata;
}

export interface UpdateNoteInput {
	title?: string;
	content?: string;
	metadata?: NoteMetadata;
}
