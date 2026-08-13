import fs from 'node:fs';
import path from 'node:path';
import { fileHistoryLocation } from './location';
import type { FileHistory } from './types';

export function saveFileHistory(history: FileHistory): void {
	const location = fileHistoryLocation();
	fs.mkdirSync(path.dirname(location), { recursive: true });
	const temporary = `${location}.${process.pid}.tmp`;
	fs.writeFileSync(temporary, JSON.stringify(history));
	fs.renameSync(temporary, location);
}
