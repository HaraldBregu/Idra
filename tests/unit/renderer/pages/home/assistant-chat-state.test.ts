import type {
	AssistantHistoryMessage,
	AssistantPendingEventPayload,
	AssistantResponseEvent,
} from '../../../../../src/shared/service';
import {
	assistantChatReducer,
	defaultPendingSelections,
	historyToChatMessages,
	initialAssistantChatState,
	pendingToMultiSelectMessage,
	type AssistantMessage,
} from '../../../../../src/renderer/src/pages/home/context';

function assistantMessage(state = initialAssistantChatState): AssistantMessage {
	const message = state.messages.find((item) => item.type === 'assistant' && item.id !== 'assistant-welcome');
	if (!message || message.type !== 'assistant') throw new Error('Assistant message missing');
	return message;
}

function startRun() {
	return assistantChatReducer(initialAssistantChatState, {
		type: 'submit_user_message',
		userMessageId: 'user-1',
		assistantMessageId: 'assistant-1',
		content: 'hello',
	});
}

const baseEvent = {
	assistantId: 'assistant',
	runId: 'run-1',
} as const;

describe('assistant chat state', () => {
	it('appends text deltas to the active assistant message', () => {
		const started = startRun();
		const next = assistantChatReducer(started, {
			type: 'apply_response_event',
			receivedAtMs: 10,
			event: {
				...baseEvent,
				type: 'text_delta',
				delta: 'Hello',
			} satisfies AssistantResponseEvent,
		});

		expect(assistantMessage(next)).toMatchObject({
			runId: 'run-1',
			state: 'answering',
			content: 'Hello',
		});
	});

	it('applies run state transitions to the matching run only', () => {
		const withRun = assistantChatReducer(startRun(), {
			type: 'apply_response_event',
			receivedAtMs: 10,
			event: {
				...baseEvent,
				type: 'run_state',
				state: 'thinking',
			} satisfies AssistantResponseEvent,
		});

		const ignored = assistantChatReducer(withRun, {
			type: 'apply_response_event',
			receivedAtMs: 11,
			event: {
				assistantId: 'assistant',
				runId: 'run-2',
				type: 'run_state',
				state: 'error',
				label: 'wrong run',
			} satisfies AssistantResponseEvent,
		});

		expect(assistantMessage(ignored)).toMatchObject({
			runId: 'run-1',
			state: 'thinking',
			errorText: undefined,
		});
	});

	it('ignores reasoning summaries because the homepage only shows run state and tool traces', () => {
		const next = assistantChatReducer(startRun(), {
			type: 'apply_response_event',
			receivedAtMs: 42,
			event: {
				...baseEvent,
				type: 'reasoning_summary',
				id: 'summary-1',
				title: 'Checking context',
				summary: 'Selecting relevant project context.',
				state: 'completed',
			} satisfies AssistantResponseEvent,
		});

		expect(assistantMessage(next)).toMatchObject({
			runId: 'run-1',
			state: 'thinking',
			tools: [],
		});
	});

	it('updates tool start, input, result, and error events on the active assistant turn', () => {
		const started = startRun();
		const withTool = assistantChatReducer(started, {
			type: 'apply_response_event',
			receivedAtMs: 10,
			event: {
				...baseEvent,
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: 'tool-1',
				toolName: 'read_file',
			} satisfies AssistantResponseEvent,
		});
		const withInput = assistantChatReducer(withTool, {
			type: 'apply_response_event',
			receivedAtMs: 11,
			event: {
				...baseEvent,
				type: 'tool_call_input',
				iteration: 0,
				toolCallId: 'tool-1',
				toolName: 'read_file',
				input: { path: 'README.md' },
				argsText: '{"path":"README.md"}',
			} satisfies AssistantResponseEvent,
		});
		const withResult = assistantChatReducer(withInput, {
			type: 'apply_response_event',
			receivedAtMs: 12,
			event: {
				...baseEvent,
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: 'tool-1',
				toolName: 'read_file',
				input: { path: 'README.md' },
				output: 'contents',
				outputText: 'contents',
				status: 'ok',
				durationMs: 15,
			} satisfies AssistantResponseEvent,
		});
		const withError = assistantChatReducer(withResult, {
			type: 'apply_response_event',
			receivedAtMs: 13,
			event: {
				...baseEvent,
				type: 'tool_call_result',
				iteration: 0,
				toolCallId: 'tool-2',
				toolName: 'exec',
				input: { command: 'bad' },
				output: 'failed',
				outputText: 'failed',
				status: 'error',
				durationMs: 9,
				errorText: 'failed',
			} satisfies AssistantResponseEvent,
		});

		expect(assistantMessage(withError).tools).toEqual([
			expect.objectContaining({
				toolCallId: 'tool-1',
				type: 'read_file',
				state: 'output-available',
				durationMs: 15,
			}),
			expect.objectContaining({
				toolCallId: 'tool-2',
				type: 'exec',
				state: 'output-error',
				errorText: 'failed',
			}),
		]);
	});

	it('inserts pending approval and input messages with default deny selection', () => {
		const pending = pendingToMultiSelectMessage(
			{
				assistantId: 'assistant',
				approvals: [
					{
						id: 'approval-1',
						kind: 'exec',
						toolName: 'exec',
						question: 'Approve?',
						title: 'Approve?',
						command: 'ls',
						createdAtMs: 1,
						expiresAtMs: 2,
						allowedDecisions: ['allow-once', 'deny'],
					},
				],
				inputs: [{ id: 'input-1', question: 'What path?' }],
			} satisfies AssistantPendingEventPayload,
			100
		);

		expect(pending).not.toBeNull();
		expect(pending?.options.map((option) => option.kind)).toEqual([
			'approval',
			'approval',
			'input',
		]);
		expect(defaultPendingSelections(pending!)).toEqual(['approval:approval-1:deny']);
	});

	it('marks cancellation on the active assistant message', () => {
		const cancelled = assistantChatReducer(startRun(), { type: 'cancel_active' });

		expect(assistantMessage(cancelled)).toMatchObject({
			state: 'cancelled',
			errorText: 'Cancelled.',
		});
	});

	it('restores history tool-use blocks into visible tool activity', () => {
		const messages = historyToChatMessages([
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: null,
				contentBlocks: [
					{
						type: 'tool_use',
						toolUseId: 'tool-1',
						toolName: 'read_file',
						toolArgs: { path: 'README.md' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-1',
				content: 'contents',
				isError: false,
			},
		] satisfies AssistantHistoryMessage[]);

		const restoredAssistant = messages.find(
			(message) => message.type === 'assistant'
		) as AssistantMessage | undefined;

		expect(restoredAssistant?.tools).toEqual([
			expect.objectContaining({
				toolCallId: 'tool-1',
				type: 'read_file',
				state: 'output-available',
				outputText: 'contents',
			}),
		]);
	});

	it('restores multi-tool history and attaches failed results by stable call id', () => {
		const messages = historyToChatMessages([
			{ role: 'user', content: 'check files' },
			{
				role: 'assistant',
				content: 'I will check.',
				contentBlocks: [
					{ type: 'text', text: 'I will check.' },
					{
						type: 'tool_use',
						toolUseId: 'tool-a',
						toolName: 'read_file',
						toolArgs: { path: 'a.txt' },
					},
					{
						type: 'tool_use',
						toolUseId: 'tool-b',
						toolName: 'read_file',
						toolArgs: { path: 'b.txt' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-b',
				content: 'missing b.txt',
				isError: true,
				status: 'error',
			},
			{
				role: 'tool',
				toolUseId: 'tool-a',
				content: 'a contents',
				isError: false,
				status: 'ok',
			},
		] satisfies AssistantHistoryMessage[]);

		const restoredAssistant = messages.find(
			(message) => message.type === 'assistant'
		) as AssistantMessage | undefined;

		expect(restoredAssistant?.tools).toEqual([
			expect.objectContaining({
				toolCallId: 'tool-a',
				type: 'read_file',
				state: 'output-available',
				outputText: 'a contents',
			}),
			expect.objectContaining({
				toolCallId: 'tool-b',
				type: 'read_file',
				state: 'output-error',
				outputText: 'missing b.txt',
				errorText: 'missing b.txt',
				status: 'error',
			}),
		]);
	});

	it('restores rejected tool results as denied rather than generic errors', () => {
		const messages = historyToChatMessages([
			{
				role: 'assistant',
				content: null,
				contentBlocks: [
					{
						type: 'tool_use',
						toolUseId: 'tool-denied',
						toolName: 'exec',
						toolArgs: { command: 'rm -rf /tmp/example' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-denied',
				content: 'User denied approval for exec.',
				isError: true,
				status: 'rejected',
			},
		] satisfies AssistantHistoryMessage[]);

		const restoredAssistant = messages.find(
			(message) => message.type === 'assistant'
		) as AssistantMessage | undefined;

		expect(restoredAssistant?.tools).toEqual([
			expect.objectContaining({
				toolCallId: 'tool-denied',
				type: 'exec',
				state: 'output-error',
				status: 'rejected',
				errorText: 'User denied approval for exec.',
			}),
		]);
	});
});
