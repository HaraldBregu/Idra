import { KeyedMutex } from '../../../../src/main/agent/mutex';
import { RealtimeVoiceToolRuntime } from '../../../../src/main/realtime_voice/tool_runtime';
import type { RealtimeVoiceConnection } from '../../../../src/main/realtime_voice/types';

it('runs native Realtime function calls through the existing tool runner and emits normalized lifecycle events', async () => {
	const events: Array<Record<string, unknown>> = [];
	let settleResult = (): void => undefined;
	const resultAdded = new Promise<void>((resolve) => (settleResult = resolve));
	const connection: RealtimeVoiceConnection = {
		appendAudio: async () => undefined,
		interrupt: async () => undefined,
		stop: async () => undefined,
		addToolResult: async (callId, output) => {
			expect({ callId, output }).toEqual({ callId: 'call-1', output: 'hello' });
			settleResult();
		},
	};
	const runtime = new RealtimeVoiceToolRuntime({
		sessionId: 'voice-session',
		windowId: 4,
		tools: [
			{
				id: 'echo',
				name: 'Echo',
				description: 'Echo input.',
				schema: { type: 'object' },
				timeoutMs: 1_000,
				maxOutputBytes: 1_000,
				parseInput: (input) => input as Record<string, unknown>,
				run: (input) => input.value,
			},
		],
		signal: new AbortController().signal,
		resources: new KeyedMutex(),
		connection: () => connection,
		emit: (event) => events.push(event),
		onThinking: () => undefined,
		onError: (error) => {
			throw error;
		},
	});

	runtime.handle({
		type: 'tool_call_start',
		callId: 'call-1',
		itemId: 'item-1',
		responseId: 'response-1',
		name: 'echo',
	});
	runtime.handle({
		type: 'tool_call_args_delta',
		callId: 'call-1',
		itemId: 'item-1',
		responseId: 'response-1',
		delta: '{"value":"hello"}',
	});
	runtime.handle({
		type: 'tool_call',
		callId: 'call-1',
		itemId: 'item-1',
		responseId: 'response-1',
		name: 'echo',
		arguments: '{"value":"hello"}',
	});
	await resultAdded;

	expect(events.map((event) => event.type)).toEqual([
		'tool_call_start',
		'tool_call_args_delta',
		'tool_call_input',
		'tool_call_result',
	]);
	expect(events.at(-1)).toMatchObject({
		sessionId: 'voice-session',
		agentId: 'main',
		runId: 'voice-session',
		toolCallId: 'call-1',
		toolName: 'echo',
		output: 'hello',
		outputText: 'hello',
		status: 'ok',
	});
});
