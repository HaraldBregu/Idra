import { AgentRunScheduler } from '../../../../src/main/agent/agent_scheduler';

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

it('serializes runs for the same session', async () => {
	const scheduler = new AgentRunScheduler(3);
	const gate = deferred();
	const order: string[] = [];
	const first = scheduler.run('session-a', async () => {
		order.push('first:start');
		await gate.promise;
		order.push('first:end');
	});
	const second = scheduler.run('session-a', async () => {
		order.push('second:start');
	});

	await flush();
	expect(order).toEqual(['first:start']);
	gate.resolve();
	await Promise.all([first, second]);
	expect(order).toEqual(['first:start', 'first:end', 'second:start']);
});

it('allows three sessions concurrently and queues the fourth', async () => {
	const scheduler = new AgentRunScheduler(3);
	const gates = [deferred(), deferred(), deferred(), deferred()];
	let active = 0;
	let peak = 0;
	const started: number[] = [];
	const runs = gates.map((gate, index) =>
		scheduler.run(`session-${index}`, async () => {
			active += 1;
			peak = Math.max(peak, active);
			started.push(index);
			await gate.promise;
			active -= 1;
		})
	);

	await flush();
	expect(started).toEqual([0, 1, 2]);
	gates[0].resolve();
	await runs[0];
	await flush();
	expect(started).toEqual([0, 1, 2, 3]);
	for (const gate of gates.slice(1)) gate.resolve();
	await Promise.all(runs);
	expect(peak).toBe(3);
});

it('prioritizes queued UI work while preserving FIFO within a priority', async () => {
	const scheduler = new AgentRunScheduler(1);
	const gate = deferred();
	const order: string[] = [];
	const blocker = scheduler.run('active', async () => {
		order.push('active');
		await gate.promise;
	});
	const normal = scheduler.run(
		'normal',
		async () => {
			order.push('normal');
		},
		{ priority: 'normal' }
	);
	const highOne = scheduler.run(
		'high-1',
		async () => {
			order.push('high-1');
		},
		{ priority: 'high' }
	);
	const highTwo = scheduler.run(
		'high-2',
		async () => {
			order.push('high-2');
		},
		{ priority: 'high' }
	);

	await flush();
	gate.resolve();
	await Promise.all([blocker, normal, highOne, highTwo]);
	expect(order).toEqual(['active', 'high-1', 'high-2', 'normal']);
});

it('runs the oldest lower-priority request after three higher-priority dequeues', async () => {
	const scheduler = new AgentRunScheduler(1);
	const gate = deferred();
	const order: string[] = [];
	const blocker = scheduler.run('active', async () => {
		await gate.promise;
	});
	const low = scheduler.run(
		'low',
		async () => {
			order.push('low');
		},
		{ priority: 'low' }
	);
	const highs = Array.from({ length: 4 }, (_, index) =>
		scheduler.run(
			`high-${index}`,
			async () => {
				order.push(`high-${index}`);
			},
			{ priority: 'high' }
		)
	);

	gate.resolve();
	await Promise.all([blocker, low, ...highs]);
	expect(order).toEqual(['high-0', 'high-1', 'high-2', 'low', 'high-3']);
});

it('removes an aborted queued run without delaying the next run for that session', async () => {
	const scheduler = new AgentRunScheduler(1);
	const gate = deferred();
	const controller = new AbortController();
	const order: string[] = [];
	const first = scheduler.run('session', async () => {
		order.push('first');
		await gate.promise;
	});
	const cancelled = scheduler.run(
		'session',
		async () => {
			order.push('cancelled');
		},
		{ signal: controller.signal }
	);
	const third = scheduler.run('session', async () => {
		order.push('third');
	});

	controller.abort(new Error('cancel queued'));
	await expect(cancelled).rejects.toThrow('cancel queued');
	gate.resolve();
	await Promise.all([first, third]);
	expect(order).toEqual(['first', 'third']);
});

it('releases the session key and global slot after failure', async () => {
	const scheduler = new AgentRunScheduler(1);
	const order: string[] = [];
	const failed = scheduler.run('session', async () => {
		order.push('failed');
		throw new Error('boom');
	});
	const next = scheduler.run('session', async () => {
		order.push('next');
	});

	await expect(failed).rejects.toThrow('boom');
	await next;
	expect(order).toEqual(['failed', 'next']);
});
