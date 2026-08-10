import { LlmContextOverflowError } from '../../../../../src/main/models/adapters/llm';
import { runModelTurn } from '../../../../../src/main/agent/run/run_model_turn';
import type { ModelTurnStream } from '../../../../../src/main/agent/run/run_model_turn';
import type { ResolvedProvider } from '../../../../../src/shared/provider_types';
import { KeyedLimiter } from '../../../../../src/main/agent/limiter';

describe('runModelTurn', () => {
	it('adds privacy-safe timing and retry counters to the terminal model event', async () => {
		const stream = jest.fn(() =>
			(async function* () {
				yield { type: 'model_call_start' as const, model: 'model' };
				yield { type: 'model_call_delta' as const, delta: 'answer' };
				yield {
					type: 'model_call_end' as const,
					model: 'model',
					stopReason: 'end_turn',
					usage: { inputTokens: 2, outputTokens: 1 },
				};
			})()
		);
		const events = runModelTurn(
			{ task: 'chat', message: 'hello' },
			{ id: 'test', apiKey: 'key' } as ResolvedProvider,
			'model',
			'system',
			[{ role: 'user', content: 'hello' }],
			[],
			new AbortController().signal,
			{},
			{ stream } as ModelTurnStream
		);
		const emitted = [];
		for await (const event of events) emitted.push(event);

		expect(emitted.at(-1)).toMatchObject({
			type: 'model_call_end',
			retryCount: 0,
			durationMs: expect.any(Number),
			firstTokenLatencyMs: expect.any(Number),
		});
		expect(stream).toHaveBeenCalledWith(expect.objectContaining({ streaming: true }));
	});

	it('forwards non-streaming transport mode without changing the event contract', async () => {
		const stream = jest.fn(() =>
			(async function* () {
				yield { type: 'model_call_start' as const, model: 'model' };
				yield { type: 'model_call_delta' as const, delta: 'answer' };
				yield { type: 'model_call_end' as const, model: 'model', stopReason: 'end_turn' };
			})()
		);
		const events = runModelTurn(
			{ task: 'chat', message: 'hello' },
			{ id: 'test', apiKey: 'key' } as ResolvedProvider,
			'model',
			'system',
			[{ role: 'user', content: 'hello' }],
			[],
			new AbortController().signal,
			{},
			{ stream } as ModelTurnStream,
			'',
			[],
			false
		);
		for await (const _event of events) void _event;

		expect(stream).toHaveBeenCalledWith(expect.objectContaining({ streaming: false }));
	});

	it('does not retry an unchanged request after context overflow', async () => {
		const error = new LlmContextOverflowError('context too long');
		const stream = jest.fn(() => ({
			[Symbol.asyncIterator]: () => ({
				next: () => Promise.reject(error),
			}),
		}));
		const events = runModelTurn(
			{ task: 'chat', message: 'hello' },
			{ id: 'test', apiKey: 'key' } as ResolvedProvider,
			'model',
			'system',
			[{ role: 'user', content: 'hello' }],
			[],
			new AbortController().signal,
			{},
			{ stream } as ModelTurnStream
		);

		await expect(events.next()).rejects.toBe(error);
		expect(stream).toHaveBeenCalledTimes(1);
	});

	it('retries transient failures at most twice before succeeding', async () => {
		let attempt = 0;
		const stream = jest.fn(() =>
			(async function* () {
				attempt += 1;
				if (attempt < 3) throw { status: 429, headers: { 'retry-after': '0' } };
				yield { type: 'model_call_start' as const, model: 'model' };
				yield { type: 'model_call_end' as const, model: 'model', stopReason: 'end_turn' };
			})()
		);
		const events = runModelTurn(
			{ task: 'chat', message: 'hello' },
			{ id: 'test', apiKey: 'key' } as ResolvedProvider,
			'model',
			'system',
			[{ role: 'user', content: 'hello' }],
			[],
			new AbortController().signal,
			{},
			{ stream } as ModelTurnStream
		);
		const emitted = [];
		for await (const event of events) emitted.push(event);

		expect(stream).toHaveBeenCalledTimes(3);
		expect(emitted.at(-1)).toMatchObject({ type: 'model_call_end', retryCount: 2 });
	});

	it('records provider queue delay after acquiring the shared provider limiter', async () => {
		const limiter = new KeyedLimiter(1);
		const blocker = await limiter.acquire('test');
		const stream = jest.fn(() =>
			(async function* () {
				yield { type: 'model_call_start' as const, model: 'model' };
				yield { type: 'model_call_end' as const, model: 'model', stopReason: 'end_turn' };
			})()
		);
		const events = runModelTurn(
			{ task: 'chat', message: 'hello' },
			{ id: 'test', apiKey: 'key' } as ResolvedProvider,
			'model',
			'system',
			[{ role: 'user', content: 'hello' }],
			[],
			new AbortController().signal,
			{},
			{ stream } as ModelTurnStream,
			'',
			[],
			true,
			limiter
		);
		const pending = events.next();
		blocker.release();

		await expect(pending).resolves.toMatchObject({
			value: {
				type: 'provider_queue_metrics',
				providerId: 'test',
				queueDelayMs: expect.any(Number),
			},
		});
		for await (const _event of events) void _event;
	});
});
