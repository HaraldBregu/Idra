import { KeyedLimiter } from '../../../../src/main/agent/limiter';

it('caps each key independently and releases queued callers in FIFO order', async () => {
	const limiter = new KeyedLimiter(3);
	const first = await limiter.acquire('openai');
	const second = await limiter.acquire('openai');
	const third = await limiter.acquire('openai');
	let fourthStarted = false;
	const fourth = limiter.acquire('openai').then((lease) => {
		fourthStarted = true;
		return lease;
	});
	const anthropic = await limiter.acquire('anthropic');

	await Promise.resolve();
	expect(fourthStarted).toBe(false);
	first.release();
	const fourthLease = await fourth;
	expect(fourthStarted).toBe(true);

	second.release();
	third.release();
	fourthLease.release();
	anthropic.release();
});

it('removes an aborted waiter and keeps the key usable', async () => {
	const limiter = new KeyedLimiter(1);
	const active = await limiter.acquire('provider');
	const controller = new AbortController();
	const waiting = limiter.acquire('provider', controller.signal);
	controller.abort(new Error('cancel wait'));

	await expect(waiting).rejects.toThrow('cancel wait');
	active.release();
	const next = await limiter.acquire('provider');
	next.release();
});
