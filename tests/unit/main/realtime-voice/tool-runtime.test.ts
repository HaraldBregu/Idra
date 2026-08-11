import { KeyedMutex } from '../../../../src/main/agent/mutex';
import { respondToolPermission } from '../../../../src/main/agent/permissions';
import { RealtimeVoiceToolRuntime } from '../../../../src/main/realtime_voice/tool_runtime';
import type { RealtimeVoiceConnection } from '../../../../src/main/models/adapters/realtime_voice';

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

it('preserves the existing permission request identity and returns rejected tool status', async () => {
	let resolvePermission = (_event: Record<string, unknown>): void => undefined;
	const permissionEvent = new Promise<Record<string, unknown>>(
		(resolve) => (resolvePermission = resolve)
	);
	let resolveResult = (_output: string): void => undefined;
	const toolResult = new Promise<string>((resolve) => (resolveResult = resolve));
	const runtime = new RealtimeVoiceToolRuntime({
		sessionId: 'voice-permission',
		windowId: 6,
		tools: [
			{
				id: 'write_file',
				name: 'Write file',
				description: 'Write a file.',
				schema: { type: 'object' },
				timeoutMs: 1_000,
				maxOutputBytes: 1_000,
				parseInput: (input) => input as Record<string, unknown>,
				run: () => {
					throw new Error('Rejected tools must not run.');
				},
			},
		],
		signal: new AbortController().signal,
		resources: new KeyedMutex(),
		connection: () => ({
			appendAudio: async () => undefined,
			interrupt: async () => undefined,
			stop: async () => undefined,
			addToolResult: async (_callId, output) => resolveResult(output),
		}),
		emit: (event) => {
			if (event.type === 'tool_permission_request') resolvePermission(event);
		},
		onThinking: () => undefined,
		onError: (error) => {
			throw error;
		},
	});

	runtime.handle({
		type: 'tool_call',
		callId: 'call-permission',
		itemId: 'item-permission',
		responseId: 'response-permission',
		name: 'write_file',
		arguments: '{"path":"/etc/friday-test","content":"test"}',
	});
	const permission = await permissionEvent;
	expect(permission).toMatchObject({
		type: 'tool_permission_request',
		sessionId: 'voice-permission',
		runId: 'voice-permission',
		toolCallId: 'call-permission',
		toolName: 'write_file',
		mode: 'ask',
	});
	expect(permission).toHaveProperty('approvalId');
	expect(permission).toHaveProperty('inputFingerprint');
	expect(permission).toHaveProperty('expiresAt');
	respondToolPermission(
		{
			approvalId: String(permission.approvalId),
			runId: 'voice-permission',
			toolName: 'write_file',
			inputFingerprint: String(permission.inputFingerprint),
		},
		'reject',
		6
	);
	expect(await toolResult).toContain('permission denied');
});

it('keeps file-access memory isolated between realtime voice runs', () => {
	const dependencies = {
		windowId: 1,
		tools: [],
		signal: new AbortController().signal,
		resources: new KeyedMutex(),
		connection: () => undefined,
		emit: () => undefined,
		onThinking: () => undefined,
		onError: () => undefined,
	};
	const first = new RealtimeVoiceToolRuntime({ sessionId: 'first', ...dependencies });
	const second = new RealtimeVoiceToolRuntime({ sessionId: 'second', ...dependencies });
	type RuntimeAccess = {
		fileAccess: { readDirectories: Set<string>; createdFiles: Set<string> };
	};
	const firstAccess = (first as unknown as RuntimeAccess).fileAccess;
	const secondAccess = (second as unknown as RuntimeAccess).fileAccess;

	firstAccess.readDirectories.add('/private/first');
	firstAccess.createdFiles.add('/private/first/file.txt');

	expect(secondAccess.readDirectories).toEqual(new Set());
	expect(secondAccess.createdFiles).toEqual(new Set());
	expect(firstAccess).not.toBe(secondAccess);
});
