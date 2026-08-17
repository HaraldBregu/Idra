import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { mcpPath } from './path';
import type { McpDocument } from './types';

export function writeMcp(dataDirectory: string, document: McpDocument): void {
	const filePath = mcpPath(dataDirectory);
	const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	try {
		fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, {
			flag: 'wx',
			mode: 0o600,
		});
		fs.renameSync(temporaryPath, filePath);
	} finally {
		fs.rmSync(temporaryPath, { force: true });
	}
}
