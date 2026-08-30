export class RequestLimiter {
	private readonly requests = new Map<string, number[]>();

	consume(key: string, limit: number, windowMs: number): boolean {
		const cutoff = Date.now() - windowMs;
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
