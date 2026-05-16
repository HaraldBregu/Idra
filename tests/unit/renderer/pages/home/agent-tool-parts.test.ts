import type { AgentResponseEvent } from '../../../../../src/shared/service';
import {
	applyAgentResponseEventToTools,
	agentToolPartFromHistoryBlock,
} from '../../../../../src/renderer/src/pages/home/context';

const baseToolEvent = {
	agentId: 'agent-1',
	runId: 'run-1',
	iteration: 0,
	toolCallId: 'tool-call-1',
	toolName: 'search_web',
} as const;

describe('agent tool parts', () => {
	it('maps AgentResponseEvent tool lifecycle events to prompt-kit ToolPart state', () => {
		const started = applyAgentResponseEventToTools([], {
			...baseToolEvent,
			type: 'tool_call_start',
		} satisfies AgentResponseEvent);

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

		const withArgs = applyAgentResponseEventToTools(started ?? [], {
			...baseToolEvent,
			type: 'tool_call_args_delta',
			jsonDelta: '{"query":"prompt-kit"}',
			argsText: '{"query":"prompt-kit"}',
		} satisfies AgentResponseEvent);

		expect(withArgs?.[0]).toMatchObject({
			state: 'input-streaming',
			inputText: '{"query":"prompt-kit"}',
		});

		const withInput = applyAgentResponseEventToTools(withArgs ?? [], {
			...baseToolEvent,
			type: 'tool_call_input',
			input: { query: 'prompt-kit' },
			argsText: '{"query":"prompt-kit"}',
		} satisfies AgentResponseEvent);

		expect(withInput?.[0]).toMatchObject({
			state: 'input-available',
			input: { query: 'prompt-kit' },
		});

		const completed = applyAgentResponseEventToTools(withInput ?? [], {
			...baseToolEvent,
			type: 'tool_call_result',
			input: { query: 'prompt-kit' },
			output: { count: 2 },
			outputText: '{"count":2}',
			status: 'ok',
			durationMs: 25,
		} satisfies AgentResponseEvent);

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
		const rejected = applyAgentResponseEventToTools([], {
			...baseToolEvent,
			type: 'tool_call_result',
			input: { command: 'rm -rf /tmp/example' },
			output: 'Denied by policy',
			outputText: 'Denied by policy',
			status: 'rejected',
			durationMs: 5,
		} satisfies AgentResponseEvent);

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

	it('ignores text deltas because they are rendered as agent message text', () => {
		const result = applyAgentResponseEventToTools([], {
			agentId: 'agent-1',
			runId: 'run-1',
			type: 'text_delta',
			delta: 'hello',
		} satisfies AgentResponseEvent);

		expect(result).toBeUndefined();
	});

	it('restores tool parts from agent history blocks', () => {
		expect(
			agentToolPartFromHistoryBlock({
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
