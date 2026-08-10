interface LimiterWaiter {
	queuedAt: number;
	signal?: AbortSignal;
	resolve: (lease: LimiterLease) => void;
	reject: (reason?: unknown) => void;
	onAbort?: () => void;
}

interface LimiterState {
	active: number;
	waiters: LimiterWaiter[];
}

export interface LimiterLease {
	queueDelayMs: number;
	release: () => void;
}

export class KeyedLimiter {
	private readonly states = new Map<string, LimiterState>();

	constructor(private readonly concurrency: number) {}

	acquire(key: string, signal?: AbortSignal): Promise<LimiterLease> {
		if (signal?.aborted) {
			return Promise.reject(signal.reason ?? new DOMException('Operation cancelled.', 'AbortError'));
		}
		const normalizedKey = key.trim().toLowerCase();
		const state = this.states.get(normalizedKey) ?? { active: 0, waiters: [] };
		this.states.set(normalizedKey, state);
		const queuedAt = Date.now();
		if (state.active < this.concurrency) {
			state.active += 1;
			return Promise.resolve(this.lease(normalizedKey, state, queuedAt));
		}
		return new Promise<LimiterLease>((resolve, reject) => {
			const waiter: LimiterWaiter = { queuedAt, signal, resolve, reject };
			if (signal) {
				waiter.onAbort = () => {
					const index = state.waiters.indexOf(waiter);
					if (index === -1) return;
					state.waiters.splice(index, 1);
					if (state.active === 0 && state.waiters.length === 0) this.states.delete(normalizedKey);
					reject(signal.reason ?? new DOMException('Operation cancelled.', 'AbortError'));
				};
				signal.addEventListener('abort', waiter.onAbort, { once: true });
			}
			state.waiters.push(waiter);
		});
	}

	private lease(key: string, state: LimiterState, queuedAt: number): LimiterLease {
		let released = false;
		return {
			queueDelayMs: Date.now() - queuedAt,
			release: () => {
				if (released) return;
				released = true;
				const waiter = state.waiters.shift();
				if (waiter) {
					if (waiter.onAbort) waiter.signal?.removeEventListener('abort', waiter.onAbort);
					waiter.resolve(this.lease(key, state, waiter.queuedAt));
					return;
				}
				state.active -= 1;
				if (state.active === 0) this.states.delete(key);
			},
		};
	}
}
