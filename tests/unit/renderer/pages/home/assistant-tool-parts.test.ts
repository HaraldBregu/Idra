import type { AssistantResponseEvent } from '../../../../../src/shared/service';
import {
	applyAssistantResponseEventToTools,
	assistantToolPartFromHistoryBlock,
} from '../../../../../src/renderer/src/pages/home/context';

const baseToolEvent = {
	assistantId: 'assistant-1',
	runId: 'run-1',
	iteration: 0,
	toolCallId: 'tool-call-1',
	toolName: 'search_web',
} as const;

describe('assistant tool parts', () => {
	it('maps AssistantResponseEvent tool lifecycle events to prompt-kit ToolPart state', () => {
		const started = applyAssistantResponseEventToTools([], {
			...baseToolEvent,
			type: 'tool_call_start',
		} satisfies AssistantResponseEvent);

		expect(started).toEqual([
			{
				toolCallId: 'tool-call-1',
				type: 'search_web',
				state: 'input-streaming',
				status: undefined,
				iteration: 0,
				input: undefined,
				inputText: '',
				output: undefined,
				outputText: undefined,
				durationMs: undefined,
				errorText: undefined,
			},
		]);

		const withArgs = applyAssistantResponseEventToTools(started ?? [], {
			...baseToolEvent,
			type: 'tool_call_args_delta',
			jsonDelta: '{"query":"prompt-kit"}',
			argsText: '{"query":"prompt-kit"}',
		} satisfies AssistantResponseEvent);

		expect(withArgs?.[0]).toMatchObject({
			state: 'input-streaming',
			inputText: '{"query":"prompt-kit"}',
		});

		const withInput = applyAssistantResponseEventToTools(withArgs ?? [], {
			...baseToolEvent,
			type: 'tool_call_input',
			input: { query: 'prompt-kit' },
			argsText: '{"query":"prompt-kit"}',
		} satisfies AssistantResponseEvent);

		expect(withInput?.[0]).toMatchObject({
			state: 'input-available',
			input: { query: 'prompt-kit' },
		});

		const completed = applyAssistantResponseEventToTools(withInput ?? [], {
			...baseToolEvent,
			type: 'tool_call_result',
			input: { query: 'prompt-kit' },
			output: { count: 2 },
			outputText: '{"count":2}',
			status: 'ok',
			durationMs: 25,
		} satisfies AssistantResponseEvent);

		expect(completed?.[0]).toMatchObject({
			type: 'search_web',
			state: 'output-available',
			iteration: 0,
			output: { count: 2 },
			outputText: '{"count":2}',
			durationMs: 25,
			errorText: undefined,
			status: 'ok',
		});
	});

	it('maps rejected tool calls to prompt-kit error state with an error message', () => {
		const rejected = applyAssistantResponseEventToTools([], {
			...baseToolEvent,
			type: 'tool_call_result',
			input: { command: 'rm -rf /tmp/example' },
			output: 'Denied by policy',
			outputText: 'Denied by policy',
			status: 'rejected',
			durationMs: 5,
		} satisfies AssistantResponseEvent);

		expect(rejected).toEqual([
			expect.objectContaining({
				toolCallId: 'tool-call-1',
				type: 'search_web',
				state: 'output-error',
				errorText: 'Denied by policy',
				status: 'rejected',
			}),
		]);
	});

	it('ignores text deltas because they are rendered as assistant message text', () => {
		const result = applyAssistantResponseEventToTools([], {
			assistantId: 'assistant-1',
			runId: 'run-1',
			type: 'text_delta',
			delta: 'hello',
		} satisfies AssistantResponseEvent);

		expect(result).toBeUndefined();
	});

	it('restores tool parts from assistant history blocks', () => {
		expect(
			assistantToolPartFromHistoryBlock({
				type: 'tool_use',
				toolUseId: 'history-tool-1',
				toolName: 'read_file',
				toolArgs: { path: 'README.md' },
			})
		).toEqual({
			toolCallId: 'history-tool-1',
			type: 'read_file',
			state: 'input-available',
			input: { path: 'README.md' },
		});
	});
});
