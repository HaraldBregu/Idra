import { promises as fs } from 'node:fs';

export interface WriteLock {
	release(): Promise<void>;
}

const locks = new Set<string>();

export async function acquireWriteLock(key: string, _options: { timeoutMs?: number } = {}): Promise<WriteLock> {
	if (locks.has(key)) throw new Error(`Session is locked: ${key}`);
	locks.add(key);
	const lockFile = `${key}.lock`;
	await fs.writeFile(lockFile, String(process.pid), { flag: 'wx' });
	return {
		release: async () => {
			locks.delete(key);
			await fs.rm(lockFile, { force: true });
		},
	};
}
