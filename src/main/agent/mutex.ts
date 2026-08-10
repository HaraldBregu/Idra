import { KeyedLimiter } from './limiter';

export class KeyedMutex {
	private readonly limiter = new KeyedLimiter(1);

	async acquire(keys: readonly string[], signal?: AbortSignal): Promise<() => void> {
		const releases: Array<() => void> = [];
		try {
			for (const key of [...new Set(keys)].sort()) {
				const lease = await this.limiter.acquire(key, signal);
				releases.push(lease.release);
			}
			let released = false;
			return () => {
				if (released) return;
				released = true;
				for (const release of releases.reverse()) release();
			};
		} catch (error) {
			for (const release of releases.reverse()) release();
			throw error;
		}
	}
}
