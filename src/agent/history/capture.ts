import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { FileSnapshot } from './types';

export function captureFiles(targets: readonly string[]): FileSnapshot[] {
	return [...new Set(targets)].map((target) => {
		try {
			const stat = fs.statSync(target);
			if (!stat.isFile()) return { path: target, exists: false };
			const content = fs.readFileSync(target);
			return {
				path: target,
				exists: true,
				content: content.toString('base64'),
				mode: stat.mode,
				hash: createHash('sha256').update(content).digest('hex'),
			};
		} catch {
			return { path: target, exists: false };
		}
	});
}
