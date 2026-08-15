import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function atomicWriteFile(filePath: string, content: string): void {
	const temporaryPath = path.join(
		path.dirname(filePath),
		`.${path.basename(filePath)}.${randomUUID()}.tmp`
	);
	try {
		fs.writeFileSync(temporaryPath, content, 'utf8');
		fs.renameSync(temporaryPath, filePath);
	} finally {
		if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
	}
}
