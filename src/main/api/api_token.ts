import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

let cached: string | undefined;

/**
 * Bearer token every API request must present, persisted in the app data folder
 * so an external app can read it once and reuse it.
 */
export function token(): string {
	if (cached) return cached;
	const file = join(app.getPath('userData'), 'sdk-token');
	cached = existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
	if (!cached) {
		cached = randomBytes(32).toString('hex');
		writeFileSync(file, cached, { mode: 0o600 });
	}
	return cached;
}
