import fs from 'node:fs';
import path from 'node:path';
import { captureFiles } from './capture';
import type { FileSnapshot } from './types';

export function restoreFiles(expected: FileSnapshot[], replacement: FileSnapshot[]): void {
	const current = captureFiles(expected.map((snapshot) => snapshot.path));
	if (current.some((snapshot, index) =>
		snapshot.exists !== expected[index].exists || snapshot.hash !== expected[index].hash
	)) throw new Error('Files changed after this operation; refusing to overwrite newer changes.');

	for (const snapshot of replacement) {
		if (!snapshot.exists) {
			fs.rmSync(snapshot.path, { force: true });
			continue;
		}
		fs.mkdirSync(path.dirname(snapshot.path), { recursive: true });
		fs.writeFileSync(snapshot.path, Buffer.from(snapshot.content ?? '', 'base64'), {
			mode: snapshot.mode,
		});
	}
}
