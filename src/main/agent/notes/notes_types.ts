export type NoteMetadata = Record<string, NoteMetadataValue>;

export type NoteMetadataValue =
	| string
	| number
	| boolean
	| null
	| NoteMetadataValue[]
	| { [key: string]: NoteMetadataValue };

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
