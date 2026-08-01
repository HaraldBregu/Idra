import path from 'node:path';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { providersDir, seedProviders } from '../../../../src/main/app/models';
import { userDataLocation } from '../../../../src/main/shared/user_data_location';

describe('providersDir', () => {
	it('stores uploaded providers in Friday user data', () => {
		expect(providersDir()).toBe(path.join(userDataLocation(), 'providers'));
	});

	it('seeds missing bundled providers without overwriting local providers', () => {
		const root = mkdtempSync(path.join(os.tmpdir(), 'friday-providers-'));
		const source = path.join(root, 'source');
		const destination = path.join(root, 'destination');
		mkdirSync(path.join(source, 'openai'), { recursive: true });
		mkdirSync(path.join(destination, 'openai'), { recursive: true });
		writeFileSync(path.join(source, 'openai', 'info.json'), 'bundled');
		writeFileSync(path.join(destination, 'openai', 'info.json'), 'local');
		mkdirSync(path.join(source, 'anthropic'), { recursive: true });
		writeFileSync(path.join(source, 'anthropic', 'info.json'), 'bundled');

		try {
			seedProviders(source, destination);
			expect(readFileSync(path.join(destination, 'openai', 'info.json'), 'utf8')).toBe('local');
			expect(readFileSync(path.join(destination, 'anthropic', 'info.json'), 'utf8')).toBe('bundled');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
