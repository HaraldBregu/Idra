import path from 'node:path';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import { ensureProvidersDir, providersDir } from '../../../../src/main/app/models';
import { userDataLocation } from '../../../../src/main/shared/user_data_location';

describe('providersDir', () => {
	it('stores uploaded providers in Friday user data', () => {
		expect(providersDir()).toBe(path.join(userDataLocation(), 'providers'));
	});

	it('creates the local providers folder without copying bundled providers', () => {
		const root = mkdtempSync(path.join(os.tmpdir(), 'friday-providers-'));
		const destination = path.join(root, 'destination');

		try {
			ensureProvidersDir(destination);
			expect(existsSync(destination)).toBe(true);
			expect(existsSync(path.join(destination, 'openai'))).toBe(false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
