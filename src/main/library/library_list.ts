import fs from 'node:fs/promises';
import path from 'node:path';
import { libraryLocation } from '../shared/library_location';
import type { LibraryFile, LibraryFileType } from '../../shared/library_types';

const EXTENSION_TYPES: Record<string, LibraryFileType> = {
	'.png': 'image',
	'.jpg': 'image',
	'.jpeg': 'image',
	'.gif': 'image',
	'.webp': 'image',
	'.bmp': 'image',
	'.svg': 'image',
	'.mp3': 'audio',
	'.wav': 'audio',
	'.ogg': 'audio',
	'.flac': 'audio',
	'.m4a': 'audio',
	'.aac': 'audio',
	'.mp4': 'video',
	'.mov': 'video',
	'.mkv': 'video',
	'.webm': 'video',
	'.avi': 'video',
};

export async function listLibrary(): Promise<LibraryFile[]> {
	const libraryDir = libraryLocation();
	let entries;
	try {
		entries = await fs.readdir(libraryDir, { withFileTypes: true });
	} catch {
		return [];
	}
	const files = await Promise.all(
		entries
			.filter((entry) => entry.isFile() && EXTENSION_TYPES[path.extname(entry.name).toLowerCase()])
			.map(async (entry) => {
				const filePath = path.join(libraryDir, entry.name);
				const stat = await fs.stat(filePath);
				return {
					name: entry.name,
					path: filePath,
					type: EXTENSION_TYPES[path.extname(entry.name).toLowerCase()],
					createdAt: stat.birthtimeMs || stat.mtimeMs,
				};
			})
	);
	return files.sort((a, b) => b.createdAt - a.createdAt);
}
