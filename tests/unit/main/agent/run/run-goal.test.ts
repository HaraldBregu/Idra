import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { clearGoal, loadGoal, setGoal, updateGoal } from '../../../../../src/main/agent/goal';
import {
	createSessionState,
	init,
	type SessionResult,
} from '../../../../../src/main/agent/session';
import { streamGoal } from '../../../../../src/main/agent/run/run_goal';
import { stream } from '../../../../../src/main/agent/run/run_stream';
import type { Config, RuntimeEvent, RuntimeInput } from '../../../../../src/main/agent/types';

jest.mock('../../../../../src/main/agent/run/run_stream', () => ({ stream: jest.fn() }));

const streamMock = jest.mocked(stream);
const sessionId = '11111111-1111-4111-8111-111111111111';
const input: RuntimeInput = {
	task: 'goal',
	message: 'finish the work',
	sessionId,
	model: 'test-model',
};

describe('thread goals', () => {
	let location: string;
	let config: Config;

	beforeEach(async () => {
		streamMock.mockReset();
		location = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-goal-'));
		config = { location };
	});

	afterEach(async () => {
		await fs.rm(location, { recursive: true, force: true });
	});

	it('persists goal state by session and clears it explicitly', () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, { maxIterations: 3, maxToolCalls: 5 });
		updateGoal(session, { status: 'paused' });

		const restored = createSessionState();
		init(restored, config, { ...input, message: '' });

		expect(loadGoal(restored)).toMatchObject({
			threadId: sessionId,
			objective: input.message,
			status: 'paused',
		});
		expect(clearGoal(restored)).toBe(true);
		expect(loadGoal(restored)).toBeUndefined();
	});

	it('continues after a tool-using turn and stops after a text-only turn', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, { maxIterations: 3, maxToolCalls: 5 });
		const firstResult: SessionResult = {
			text: 'first turn',
			model: 'test-model',
			toolCalls: [],
			numTurns: 1,
			subtype: 'success',
			sessionId,
			stopReason: 'end_turn',
		};
		const finalResult = { ...firstResult, text: 'waiting for user' };
		streamMock
			.mockImplementationOnce(async function* () {
				yield {
					type: 'model_call_end',
					model: 'test-model',
					usage: { inputTokens: 10, outputTokens: 5 },
				};
				yield {
					type: 'assistant_message',
					content: '',
					toolCalls: [{ id: 'tool-1', name: 'inspect', args: {} }],
				};
				yield {
					type: 'tool_call_start',
					toolCallId: 'tool-1',
					toolName: 'inspect',
					input: {},
				};
				yield { type: 'run_finished', result: firstResult };
			})
			.mockImplementationOnce(async function* () {
				yield {
					type: 'model_call_end',
					model: 'test-model',
					usage: { inputTokens: 8, outputTokens: 4 },
				};
				yield { type: 'assistant_message', content: 'waiting', toolCalls: [] };
				yield { type: 'run_finished', result: finalResult };
			});

		const events: RuntimeEvent[] = [];
		for await (const event of streamGoal(config, session, input, new AbortController().signal))
			events.push(event);

		expect(streamMock).toHaveBeenCalledTimes(2);
		expect(events.filter((event) => event.type === 'run_finished')).toEqual([
			{ type: 'run_finished', result: finalResult },
		]);
		expect(loadGoal(session)).toMatchObject({
			status: 'active',
			usage: { iterations: 2, toolCalls: 1, inputTokens: 18, outputTokens: 9 },
		});
		expect(session.messages.at(-1)?.content).toEqual([
			expect.objectContaining({ internal: true }),
		]);
	});

	it('marks the goal budget-limited instead of starting another turn', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, { maxIterations: 1, maxToolCalls: 5 });
		const result: SessionResult = {
			text: 'progress',
			model: 'test-model',
			toolCalls: [],
			numTurns: 1,
			subtype: 'success',
			sessionId,
			stopReason: 'end_turn',
		};
		streamMock.mockImplementationOnce(async function* () {
			yield {
				type: 'assistant_message',
				content: '',
				toolCalls: [{ id: 'tool-1', name: 'inspect', args: {} }],
			};
			yield {
				type: 'tool_call_start',
				toolCallId: 'tool-1',
				toolName: 'inspect',
				input: {},
			};
			yield { type: 'run_finished', result };
		});

		const events: RuntimeEvent[] = [];
		for await (const event of streamGoal(config, session, input, new AbortController().signal))
			events.push(event);

		expect(streamMock).toHaveBeenCalledTimes(1);
		expect(loadGoal(session)).toMatchObject({
			status: 'budget_limited',
			budgetReason: 'max_iterations',
		});
		expect(events.at(-1)).toMatchObject({
			type: 'run_finished',
			result: { subtype: 'error_max_turns', stopReason: 'max_iterations' },
		});
	});

	it('pauses an active goal when its run is interrupted', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, { maxIterations: 3, maxToolCalls: 5 });
		const controller = new AbortController();
		controller.abort(new Error('cancelled'));
		streamMock.mockImplementationOnce(async function* () {
			yield* [] as RuntimeEvent[];
			throw new Error('cancelled');
		});

		await expect(
			(async () => {
				for await (const event of streamGoal(config, session, input, controller.signal)) void event;
			})(),
		).rejects.toThrow('cancelled');
		expect(loadGoal(session)?.status).toBe('paused');
	});

	it('does not execute a tool batch that exceeds the remaining tool budget', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, { maxIterations: 3, maxToolCalls: 1 });
		streamMock.mockImplementationOnce(async function* () {
			yield {
				type: 'assistant_message',
				content: '',
				toolCalls: [
					{ id: 'tool-1', name: 'inspect', args: {} },
					{ id: 'tool-2', name: 'inspect', args: {} },
				],
			};
			throw new Error('the rejected tool batch must not resume');
		});

		const events: RuntimeEvent[] = [];
		for await (const event of streamGoal(config, session, input, new AbortController().signal))
			events.push(event);

		expect(events.some((event) => event.type === 'tool_call_start')).toBe(false);
		expect(loadGoal(session)).toMatchObject({
			status: 'budget_limited',
			budgetReason: 'max_tool_calls',
			usage: { toolCalls: 0 },
		});
	});

	it('stops before tool execution when the token budget is crossed', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, {
			maxIterations: 3,
			maxToolCalls: 5,
			maxTokens: 10,
		});
		streamMock.mockImplementationOnce(async function* () {
			yield {
				type: 'model_call_end',
				model: 'test-model',
				usage: { inputTokens: 7, outputTokens: 4 },
			};
			throw new Error('the over-budget turn must not resume');
		});

		for await (const event of streamGoal(config, session, input, new AbortController().signal))
			void event;

		expect(loadGoal(session)).toMatchObject({
			status: 'budget_limited',
			budgetReason: 'max_tokens',
			usage: { inputTokens: 7, outputTokens: 4 },
		});
	});

	it('stops after goal_complete changes the durable status', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, { maxIterations: 3, maxToolCalls: 5 });
		const result: SessionResult = {
			text: 'done',
			model: 'test-model',
			toolCalls: [],
			numTurns: 1,
			subtype: 'success',
			sessionId,
			stopReason: 'end_turn',
		};
		streamMock.mockImplementationOnce(async function* () {
			yield {
				type: 'tool_call_start',
				toolCallId: 'complete-1',
				toolName: 'goal_complete',
				input: { evidence: 'tests passed' },
			};
			updateGoal(session, { status: 'complete', completionEvidence: 'tests passed' });
			yield { type: 'run_finished', result };
		});

		const events: RuntimeEvent[] = [];
		for await (const event of streamGoal(config, session, input, new AbortController().signal))
			events.push(event);

		expect(streamMock).toHaveBeenCalledTimes(1);
		expect(loadGoal(session)).toMatchObject({
			status: 'complete',
			completionEvidence: 'tests passed',
		});
		expect(events.at(-1)).toEqual({ type: 'run_finished', result });
	});

	it('turns an expired deadline into a timeout outcome', async () => {
		const session = createSessionState();
		init(session, config, input);
		setGoal(session, input.message, {
			maxIterations: 3,
			maxToolCalls: 5,
			timeoutMs: 5,
		});
		streamMock.mockImplementationOnce(async function* (_config, _session, _input, signal) {
			yield* [] as RuntimeEvent[];
			await new Promise<void>((_, reject) => {
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
		});

		for await (const event of streamGoal(config, session, input, new AbortController().signal))
			void event;

		expect(loadGoal(session)).toMatchObject({
			status: 'budget_limited',
			budgetReason: 'timeout',
		});
	});
});
