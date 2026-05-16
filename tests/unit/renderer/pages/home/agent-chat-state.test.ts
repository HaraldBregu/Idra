import type {
	AgentHistoryMessage,
	AgentPendingEventPayload,
	AgentResponseEvent,
} from '../../../../../src/shared/service';
import {
	agentChatReducer,
	defaultPendingSelections,
	historyToChatMessages,
	initialAgentChatState,
	pendingToMultiSelectMessage,
	type AgentMessage,
} from '../../../../../src/renderer/src/pages/home/context';

function agentMessage(state = initialAgentChatState): AgentMessage {
	const message = state.messages.find((item) => item.type === 'agent' && item.id !== 'agent-welcome');
	if (!message || message.type !== 'agent') throw new Error('Agent message missing');
	return message;
}

function startRun() {
	return agentChatReducer(initialAgentChatState, {
		type: 'submit_user_message',
		userMessageId: 'user-1',
		agentMessageId: 'agent-1',
		content: 'hello',
		submittedAtMs: 1_000,
	});
}

const baseEvent = {
	agentId: 'agent',
	runId: 'run-1',
} as const;

describe('agent chat state', () => {
	it('appends text deltas to the active agent message', () => {
		const started = startRun();
		const next = agentChatReducer(started, {
			type: 'apply_response_event',
			receivedAtMs: 10,
			event: {
				...baseEvent,
				type: 'text_delta',
				delta: 'Hello',
			} satisfies AgentResponseEvent,
		});

		expect(agentMessage(next)).toMatchObject({
			runId: 'run-1',
			state: 'answering',
			content: 'Hello',
		});
	});

	it('applies run state transitions to the matching run only', () => {
		const withRun = agentChatReducer(startRun(), {
			type: 'apply_response_event',
			receivedAtMs: 10,
			event: {
				...baseEvent,
				type: 'run_state',
				state: 'thinking',
			} satisfies AgentResponseEvent,
		});

		const ignored = agentChatReducer(withRun, {
			type: 'apply_response_event',
			receivedAtMs: 11,
			event: {
				agentId: 'agent',
				runId: 'run-2',
				type: 'run_state',
				state: 'error',
				label: 'wrong run',
			} satisfies AgentResponseEvent,
		});

		expect(agentMessage(ignored)).toMatchObject({
			runId: 'run-1',
			state: 'thinking',
			errorText: undefined,
		});
	});

	it('ignores reasoning summaries because the homepage only shows run state and tool traces', () => {
		const next = agentChatReducer(startRun(), {
			type: 'apply_response_event',
			receivedAtMs: 42,
			event: {
				...baseEvent,
				type: 'reasoning_summary',
				id: 'summary-1',
				title: 'Checking context',
				summary: 'Selecting relevant project context.',
				state: 'completed',
			} satisfies AgentResponseEvent,
		});

		expect(agentMessage(next)).toMatchObject({
			runId: 'run-1',
			state: 'thinking',
			tools: [],
		});
	});

	it('updates tool start, input, result, and error events on the active agent turn', () => {
		const started = startRun();
		const withTool = agentChatReducer(started, {
			type: 'apply_response_event',
			receivedAtMs: 10,
			event: {
				...baseEvent,
				type: 'tool_call_start',
				iteration: 0,
				toolCallId: 'tool-1',
				toolName: 'read_file',
			} satisfies AgentResponseEvent,
		});
		const withInput = agentChatReducer(withTool, {
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
			} satisfies AgentResponseEvent,
		});
		const withResult = agentChatReducer(withInput, {
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
			} satisfies AgentResponseEvent,
		});
		const withError = agentChatReducer(withResult, {
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
			} satisfies AgentResponseEvent,
		});

		expect(agentMessage(withError).tools).toEqual([
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
				agentId: 'agent',
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
			} satisfies AgentPendingEventPayload,
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

	it('marks cancellation on the active agent message', () => {
		const cancelled = agentChatReducer(startRun(), { type: 'cancel_active' });

		expect(agentMessage(cancelled)).toMatchObject({
			state: 'cancelled',
			errorText: 'Cancelled.',
		});
	});

	it('tracks agent elapsed time across submit and completion', () => {
		const completed = agentChatReducer(startRun(), {
			type: 'complete_active',
			response: 'done',
			completedAtMs: 3_750,
		});

		expect(agentMessage(completed)).toMatchObject({
			startedAtMs: 1_000,
			completedAtMs: 3_750,
			state: 'completed',
		});
	});

	it('restores history tool-use blocks into visible tool activity', () => {
		const messages = historyToChatMessages([
			{ role: 'user', content: 'read it' },
			{
				role: 'agent',
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
		] satisfies AgentHistoryMessage[]);

		const restoredAgent = messages.find(
			(message) => message.type === 'agent'
		) as AgentMessage | undefined;

		expect(restoredAgent?.tools).toEqual([
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
				role: 'agent',
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
		] satisfies AgentHistoryMessage[]);

		const restoredAgent = messages.find(
			(message) => message.type === 'agent'
		) as AgentMessage | undefined;

		expect(restoredAgent?.tools).toEqual([
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
				role: 'agent',
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
		] satisfies AgentHistoryMessage[]);

		const restoredAgent = messages.find(
			(message) => message.type === 'agent'
		) as AgentMessage | undefined;

		expect(restoredAgent?.tools).toEqual([
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
