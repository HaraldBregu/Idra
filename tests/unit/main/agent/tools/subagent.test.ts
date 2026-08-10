const mockStream = jest.fn();

jest.mock('../../../../../src/main/agent/run/run_stream', () => ({
	stream: (...args: unknown[]) => mockStream(...args),
}));

import { createContext } from '../../../../../src/main/agent/context';
import type { SessionState } from '../../../../../src/main/agent/session';
import { subagentTool } from '../../../../../src/main/agent/tools/assistant/subagent';
import { subagentsTool } from '../../../../../src/main/agent/tools/assistant/subagents';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import { KeyedLimiter } from '../../../../../src/main/agent/limiter';

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('subagentTool', () => {
	beforeEach(() => {
		mockStream.mockReset();
	});

	it('ignores model-supplied system instructions', async () => {
		mockStream.mockReturnValue(
			(async function* () {
				yield { type: 'assistant_message', content: 'done', toolCalls: [] };
			})()
		);
		const parent = createContext();
		const tool = subagentTool({ location: '/agent' }, [], parent);

		await tool.run({ task: 'inspect context', systemPrompt: 'Act as a test reviewer.' });

		const session = mockStream.mock.calls[0][1] as SessionState;
		expect(session.messages).toEqual([{ role: 'user', content: 'inspect context' }]);
		expect(session.context.basePrompt).not.toContain('Act as a test reviewer.');
		expect(session.context.basePrompt).toContain('- Stay focused:');
		expect(parent.subagents).toEqual([session.context]);
		expect(mockStream.mock.calls[0][4]).toEqual({ tools: [], interactive: false });
		expect(mockStream.mock.calls[0][2]).toMatchObject({
			origin: 'subagent',
			contextMode: 'minimal',
			toolsAllow: [],
		});
	});

	it('does not forward a model-supplied permission bypass', async () => {
		mockStream.mockReturnValue(
			(async function* () {
				yield { type: 'assistant_message', content: 'done', toolCalls: [] };
			})()
		);
		const tool = subagentTool({ location: '/agent' }, [], createContext());

		await tool.run({ task: 'apply the change', permissionMode: 'bypass' });

		expect(mockStream.mock.calls[0][4]).toEqual({
			tools: [],
			interactive: false,
		});
	});

	it('runs three batch children concurrently, preserves order, and isolates failure', async () => {
		const releases = new Map<string, () => void>();
		let active = 0;
		let peak = 0;
		mockStream.mockImplementation(
			(_config: unknown, _session: unknown, input: { message: string }) =>
				(async function* () {
					active += 1;
					peak = Math.max(peak, active);
					await new Promise<void>((resolve) => releases.set(input.message, resolve));
					active -= 1;
					if (input.message === 'fail') throw new Error('child failed');
					yield { type: 'assistant_message', content: `${input.message}:done`, toolCalls: [] };
				})()
		);
		const tool = subagentsTool({ location: '/agent' }, [], createContext());
		const pending = tool.run({
			tasks: [
				{ id: 'first', task: 'slow' },
				{ id: 'second', task: 'fail' },
				{ id: 'third', task: 'fast' },
			],
		}) as Promise<unknown>;

		await flush();
		expect(peak).toBe(3);
		releases.get('fast')?.();
		releases.get('fail')?.();
		releases.get('slow')?.();
		await expect(pending).resolves.toEqual([
			{ id: 'first', status: 'fulfilled', text: 'slow:done' },
			{ id: 'second', status: 'rejected', text: 'child failed' },
			{ id: 'third', status: 'fulfilled', text: 'fast:done' },
		]);
	});

	it('gives batch children only explicitly parallel-safe tools', async () => {
		mockStream.mockImplementation(
			(_config: unknown, _session: unknown, input: { message: string }) =>
				(async function* () {
					yield { type: 'assistant_message', content: input.message, toolCalls: [] };
				})()
		);
		const safe = jsonTool({
			name: 'read',
			description: 'read',
			parallelSafe: true,
			schema: { type: 'object' },
			execute: () => undefined,
		});
		const unsafe = jsonTool({
			name: 'exec',
			description: 'execute',
			schema: { type: 'object' },
			execute: () => undefined,
		});
		const tool = subagentsTool({ location: '/agent' }, [safe, unsafe], createContext());

		await tool.run({
			tasks: [
				{ id: 'a', task: 'a' },
				{ id: 'b', task: 'b' },
			],
		});

		for (const call of mockStream.mock.calls) {
			expect(call[4].tools.map((candidate: { name: string }) => candidate.name)).toEqual(['read']);
		}
	});

	it('shares a process pool and propagates parent cancellation to every active child', async () => {
		const signals: AbortSignal[] = [];
		mockStream.mockImplementation(
			(_config: unknown, _session: unknown, _input: unknown, signal: AbortSignal) =>
				(async function* () {
					signals.push(signal);
					await new Promise<void>((_resolve, reject) => {
						signal.addEventListener('abort', () => reject(signal.reason), { once: true });
					});
					yield* [];
				})()
		);
		const controller = new AbortController();
		const pool = new KeyedLimiter(3);
		const tool = subagentsTool({ location: '/agent' }, [], createContext(), {}, pool);
		const pending = tool.run(
			{
				tasks: [
					{ id: 'a', task: 'a' },
					{ id: 'b', task: 'b' },
					{ id: 'c', task: 'c' },
				],
			},
			controller.signal
		) as Promise<Array<{ status: string }>>;

		await flush();
		expect(signals).toHaveLength(3);
		controller.abort(new Error('cancel parent'));
		await expect(pending).resolves.toEqual(
			expect.arrayContaining([expect.objectContaining({ status: 'rejected' })])
		);
		expect(signals.every((signal) => signal.aborted)).toBe(true);
	});

	it('requires two or three independent tasks', async () => {
		const tool = subagentsTool({ location: '/agent' }, [], createContext());
		await expect(tool.run({ tasks: [{ id: 'one', task: 'one' }] })).rejects.toThrow();
		await expect(
			tool.run({
				tasks: [
					{ id: '1', task: '1' },
					{ id: '2', task: '2' },
					{ id: '3', task: '3' },
					{ id: '4', task: '4' },
				],
			})
		).rejects.toThrow();
	});
});
