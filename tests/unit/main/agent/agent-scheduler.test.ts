import { AgentRunScheduler } from '../../../../src/main/agent/agent_scheduler';

function deferred(): { promise: Promise<void>; resolve: () => void } {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

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

	await Promise.resolve();
	await Promise.resolve();
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

	await Promise.resolve();
	await Promise.resolve();
	expect(started).toEqual([0, 1, 2]);
	gates[0].resolve();
	await runs[0];
	await Promise.resolve();
	expect(started).toEqual([0, 1, 2, 3]);
	for (const gate of gates.slice(1)) gate.resolve();
	await Promise.all(runs);
	expect(peak).toBe(3);
});
