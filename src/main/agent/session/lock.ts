import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface LockHandle {
	release(): Promise<void>;
}

export async function acquireWriteLock(
	filePath: string,
	opts: { timeoutMs?: number } = {}
): Promise<LockHandle> {
	const lockPath = filePath + '.lock';
	const timeoutMs = opts.timeoutMs ?? 10_000;
	const start = Date.now();
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	while (true) {
		try {
			const handle = await fs.open(lockPath, 'wx');
			await handle.writeFile(String(process.pid));
			await handle.close();
			return {
				async release() {
					try {
						await fs.unlink(lockPath);
					} catch {
						/* ignore */
					}
				},
			};
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
			if (Date.now() - start > timeoutMs) {
				try {
					const data = await fs.readFile(lockPath, 'utf8');
					const stale = parseInt(data, 10);
					if (Number.isFinite(stale)) {
						try {
							process.kill(stale, 0);
						} catch {
							await fs.unlink(lockPath).catch(() => undefined);
							continue;
						}
					}
				} catch {
					/* ignore */
				}
				throw new Error(`could not acquire lock on ${filePath} within ${timeoutMs}ms`);
			}
			await new Promise((r) => setTimeout(r, 50));
		}
	}
}
