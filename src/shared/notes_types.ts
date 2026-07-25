export interface Note {
	id: string;
	title: string;
	content: string;
	metadata: Record<string, unknown>;
	updatedAt: string;
}

export type NoteInput = Partial<Pick<Note, 'title' | 'content' | 'metadata'>>;
