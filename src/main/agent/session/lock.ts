export interface WriteLock {
	release(): void;
}

const locks = new Set<string>();

export async function acquireWriteLock(key: string): Promise<WriteLock> {
	if (locks.has(key)) throw new Error(`Session is locked: ${key}`);
	locks.add(key);
	return { release: () => locks.delete(key) };
}
