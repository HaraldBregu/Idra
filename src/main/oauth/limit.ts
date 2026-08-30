export class RequestLimiter {
	private readonly requests = new Map<string, number[]>();

	consume(key: string, limit: number, windowMs: number): boolean {
		const cutoff = Date.now() - windowMs;
		if (this.requests.size >= 10_000) {
			for (const [storedKey, times] of this.requests) {
				if (times.at(-1) !== undefined && times.at(-1)! <= cutoff)
					this.requests.delete(storedKey);
			}
		}
		if (!this.requests.has(key) && this.requests.size >= 10_000) return false;
		const recent = (this.requests.get(key) ?? []).filter((time) => time > cutoff);
		if (recent.length >= limit) {
			this.requests.set(key, recent);
			return false;
		}
		recent.push(Date.now());
		this.requests.set(key, recent);
		return true;
	}
}
