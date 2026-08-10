import { KeyedMutex } from '../../../../src/main/agent/mutex';

it('serializes matching resources while unrelated resources overlap', async () => {
	const mutex = new KeyedMutex();
	const first = await mutex.acquire(['/workspace/a']);
	let sameStarted = false;
	const same = mutex.acquire(['/workspace/a']).then((release) => {
		sameStarted = true;
		return release;
	});
	const different = await mutex.acquire(['/workspace/b']);

	await Promise.resolve();
	expect(sameStarted).toBe(false);
	different();
	first();
	const releaseSame = await same;
	expect(sameStarted).toBe(true);
	releaseSame();
});

it('sorts multi-resource acquisition and removes cancelled waiters', async () => {
	const mutex = new KeyedMutex();
	const first = await mutex.acquire(['b', 'a']);
	const controller = new AbortController();
	const cancelled = mutex.acquire(['a', 'b'], controller.signal);
	controller.abort(new Error('cancel locks'));

	await expect(cancelled).rejects.toThrow('cancel locks');
	first();
	const next = await mutex.acquire(['a', 'b']);
	next();
});
