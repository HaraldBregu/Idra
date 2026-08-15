import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { StoredSettings } from './types';

export function writeSettings(dataDirectory: string, settings: StoredSettings): void {
	const resolvedDirectory = path.resolve(dataDirectory);
	const filePath = path.join(resolvedDirectory, 'settings.json');
	const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
	fs.mkdirSync(resolvedDirectory, { recursive: true });
	try {
		fs.writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
			flag: 'wx',
			mode: 0o600,
		});
		fs.renameSync(temporaryPath, filePath);
	} finally {
		fs.rmSync(temporaryPath, { force: true });
	}
}
