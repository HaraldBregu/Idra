export type LibraryFileType = 'image' | 'audio' | 'video';

export interface LibraryFile {
	name: string;
	path: string;
	type: LibraryFileType;
	createdAt: number;
}
