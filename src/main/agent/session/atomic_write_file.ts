import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function atomicWriteFile(filePath: string, content: string): void {
	const temporaryPath = path.join(
		path.dirname(filePath),
		`.${path.basename(filePath)}.${randomUUID()}.tmp`
	);
	try {
		fs.writeFileSync(temporaryPath, content, { encoding: 'utf8', mode: 0o600 });
		fs.renameSync(temporaryPath, filePath);
		fs.chmodSync(filePath, 0o600);
	} finally {
		if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
	}
}
