import path from 'node:path';
import { app } from 'electron';

export function notesPath(): string {
	return path.join(app.getPath('userData'), 'notes.json');
}
