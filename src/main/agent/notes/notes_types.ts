export type NoteMetadata = Record<string, NoteMetadataValue>;

export type NoteMetadataValue =
	| string
	| number
	| boolean
	| null
	| NoteMetadataValue[]
	| { [key: string]: NoteMetadataValue };

export interface Note {
	id: string;
	title: string;
	content: string;
	createdAt: string;
	updatedAt: string;
	metadata: NoteMetadata;
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
