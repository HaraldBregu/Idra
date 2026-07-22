import path from 'node:path';
import type { Config } from '../types';
import { notesRoot } from './notes_root';

export function noteFilePath(config: Config, id: string): string {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
		throw new Error(`Invalid note id: "${id}".`);
	return path.join(notesRoot(config), `${id}.md`);
}
