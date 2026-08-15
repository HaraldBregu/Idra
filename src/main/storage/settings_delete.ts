import fs from 'node:fs';
import path from 'node:path';

export function deleteSettings(dataDirectory: string): boolean {
	const filePath = path.join(path.resolve(dataDirectory), 'settings.json');
	if (!fs.existsSync(filePath)) return false;
	fs.rmSync(filePath);
	return true;
}
