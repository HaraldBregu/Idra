import { existsSync, readFileSync } from 'node:fs';
import { atomicWriteFile } from './session_atomic_write';
import { parseMessages } from './session_parse_messages';

export function writeMessagesFile(filePath: string, backupPath: string, content: string): void {
	if (existsSync(filePath)) {
		const current = readFileSync(filePath, 'utf8');
		if (parseMessages(current) !== undefined) atomicWriteFile(backupPath, current);
	}
	atomicWriteFile(filePath, content);
}
