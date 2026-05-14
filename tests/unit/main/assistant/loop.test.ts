import type OpenAI from 'openai';
import { runAgent } from '../../../../src/main/assistant/loop';
import { RunState } from '../../../../src/main/assistant/run-state';
import { Tool } from '../../../../src/main/assistant/tools/base';

class StubTool extends Tool {
	name: string;
	description = 'stub';
	parameters = {};
	executed: Array<Record<string, unknown>> = [];
	private approval: boolean;

	constructor(name: string, opts: { needsApproval?: boolean } = {}) {
		super();
		this.name = name;
		this.approval = opts.needsApproval ?? false;
	}

	needsApproval(): boolean {
		return this.approval;
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		this.executed.push(args);
		return `executed ${this.name}`;
	}
}

class InputTool extends Tool {
	name = 'ask_human';
	description = 'Ask the human';
	parameters = {};
	get kind(): 'input' {
		return 'input';
	}
	async execute(): Promise<string> {
		return '';
	}
}

function makeClient(scripted: Array<unknown>): OpenAI {
	const create = jest.fn();
	for (const value of scripted) {
		create.mockImplementationOnce(async () => value);
	}
	return { responses: { create } } as unknown as OpenAI;
}

function initialState(): RunState {
	return RunState.initial({
		runId: 'run-test',
		userMessage: 'hi',
		systemPrompt: 'sys',
		input: [{ type: 'message', role: 'user', content: 'hi' }],
		newMessages: [{ role: 'user', content: 'hi' }],
	});
}

describe('runAgent', () => {
	it('returns done with the assistant text when the model emits no tool calls', async () => {
		const client = makeClient([
			{
				output: [{ type: 'message', role: 'assistant', content: [] }],
				output_text: 'hello!',
				usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
			},
		]);
		const outcome = await runAgent({
			client,
			model: 'gpt-x',
			tools: [],
			state: initialState(),
		});
		expect(outcome.status).toBe('done');
		if (outcome.status === 'done') {
			expect(outcome.text).toBe('hello!');
			expect(outcome.usage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 });
			expect(outcome.iterations).toBe(1);
		}
	});

	it('runs a non-approval tool, feeds output back, and completes', async () => {
		const tool = new StubTool('echo');
		const client = makeClient([
			{
				output: [
					{ type: 'function_call', name: 'echo', arguments: '{"msg":"hi"}', call_id: 'c1' },
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
			{
				output: [],
				output_text: 'done',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);
		const outcome = await runAgent({
			client,
			model: 'gpt-x',
			tools: [tool],
			state: initialState(),
		});
		expect(tool.executed).toEqual([{ msg: 'hi' }]);
		expect(outcome.status).toBe('done');
		if (outcome.status === 'done') expect(outcome.text).toBe('done');
	});

	it('pauses with awaiting_approval when a tool requires approval and no decision exists', async () => {
		const tool = new StubTool('write_file', { needsApproval: true });
		const client = makeClient([
			{
				output: [
					{ type: 'function_call', name: 'write_file', arguments: '{"path":"/x"}', call_id: 'c1' },
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);
		const onApproval = jest.fn();
		const outcome = await runAgent({
			client,
			model: 'gpt-x',
			tools: [tool],
			state: initialState(),
			hooks: { onApprovalRequest: onApproval },
		});
		expect(outcome.status).toBe('awaiting_approval');
		if (outcome.status === 'awaiting_approval') {
			expect(outcome.pending).toEqual([
				{ callId: 'c1', toolName: 'write_file', arguments: '{"path":"/x"}' },
			]);
		}
		expect(tool.executed).toHaveLength(0);
		expect(onApproval).toHaveBeenCalledTimes(1);
	});

	it('resumes and executes the tool after the human approves', async () => {
		const tool = new StubTool('write_file', { needsApproval: true });
		const state = initialState();

		const client = makeClient([
			{
				output: [
					{ type: 'function_call', name: 'write_file', arguments: '{"path":"/x"}', call_id: 'c1' },
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
			{
				output: [],
				output_text: 'final answer',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);

		const pause = await runAgent({
			client,
			model: 'gpt-x',
			tools: [tool],
			state,
		});
		expect(pause.status).toBe('awaiting_approval');

		state.approve('c1');

		const resume = await runAgent({
			client,
			model: 'gpt-x',
			tools: [tool],
			state,
		});
		expect(resume.status).toBe('done');
		if (resume.status === 'done') expect(resume.text).toBe('final answer');
		expect(tool.executed).toEqual([{ path: '/x' }]);
	});

	it('skips execution and feeds rejection text back when the human rejects', async () => {
		const tool = new StubTool('write_file', { needsApproval: true });
		const state = initialState();
		const client = makeClient([
			{
				output: [
					{ type: 'function_call', name: 'write_file', arguments: '{"path":"/x"}', call_id: 'c1' },
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
			{
				output: [],
				output_text: 'aborted',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);

		await runAgent({ client, model: 'gpt-x', tools: [tool], state });
		state.reject('c1', { message: 'wrong path' });
		const resume = await runAgent({ client, model: 'gpt-x', tools: [tool], state });

		expect(tool.executed).toHaveLength(0);
		expect(resume.status).toBe('done');
		if (resume.status === 'done') expect(resume.text).toBe('aborted');
	});

	it('invokes onStart, onIteration, onToolCall, and onFinish in order', async () => {
		const tool = new StubTool('echo');
		const events: string[] = [];
		const client = makeClient([
			{
				output: [
					{ type: 'function_call', name: 'echo', arguments: '{}', call_id: 'c1' },
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
			{
				output: [],
				output_text: 'ok',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);
		await runAgent({
			client,
			model: 'gpt-x',
			tools: [tool],
			state: initialState(),
			hooks: {
				onStart: () => void events.push('start'),
				onIteration: () => void events.push('iteration'),
				onToolCall: () => void events.push('tool_call'),
				onFinish: () => void events.push('finish'),
			},
		});
		expect(events).toEqual(['start', 'iteration', 'tool_call', 'iteration', 'finish']);
	});

	it('pauses with awaiting_input when the model calls an input-kind tool', async () => {
		const ask = new InputTool();
		const client = makeClient([
			{
				output: [
					{
						type: 'function_call',
						name: 'ask_human',
						arguments: '{"question":"Where should I put it?","suggestions":["~/Docs","~/Desktop"]}',
						call_id: 'c1',
					},
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);
		const onInput = jest.fn();
		const outcome = await runAgent({
			client,
			model: 'gpt-x',
			tools: [ask],
			state: initialState(),
			hooks: { onInputRequest: onInput },
		});
		expect(outcome.status).toBe('awaiting_input');
		if (outcome.status === 'awaiting_input') {
			expect(outcome.pendingInputs).toEqual([
				{
					callId: 'c1',
					toolName: 'ask_human',
					question: 'Where should I put it?',
					suggestions: ['~/Docs', '~/Desktop'],
				},
			]);
		}
		expect(onInput).toHaveBeenCalledTimes(1);
	});

	it('resumes with the human answer as the input tool output', async () => {
		const ask = new InputTool();
		const state = initialState();
		const client = makeClient([
			{
				output: [
					{
						type: 'function_call',
						name: 'ask_human',
						arguments: '{"question":"path?"}',
						call_id: 'c1',
					},
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
			{
				output: [],
				output_text: 'noted',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);
		await runAgent({ client, model: 'gpt-x', tools: [ask], state });
		state.recordInputResponse('c1', '~/Documents/notes.md');
		const resume = await runAgent({ client, model: 'gpt-x', tools: [ask], state });
		expect(resume.status).toBe('done');
		if (resume.status === 'done') expect(resume.text).toBe('noted');
		const sentInput = (client.responses.create as jest.Mock).mock.calls[1][0].input;
		const lastOutput = sentInput[sentInput.length - 1];
		expect(lastOutput).toMatchObject({
			type: 'function_call_output',
			call_id: 'c1',
			output: '~/Documents/notes.md',
		});
	});

	it('honors editedArguments on approval', async () => {
		const tool = new StubTool('write_file', { needsApproval: true });
		const state = initialState();
		const client = makeClient([
			{
				output: [
					{
						type: 'function_call',
						name: 'write_file',
						arguments: '{"path":"/wrong"}',
						call_id: 'c1',
					},
				],
				output_text: '',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
			{
				output: [],
				output_text: 'wrote it',
				usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
			},
		]);
		await runAgent({ client, model: 'gpt-x', tools: [tool], state });
		state.approve('c1', { editedArguments: '{"path":"/right"}' });
		await runAgent({ client, model: 'gpt-x', tools: [tool], state });
		expect(tool.executed).toEqual([{ path: '/right' }]);
	});

	it('returns max_iterations when the loop never resolves', async () => {
		const tool = new StubTool('echo');
		const client = {
			responses: {
				create: jest.fn().mockResolvedValue({
					output: [
						{ type: 'function_call', name: 'echo', arguments: '{}', call_id: `c${Math.random()}` },
					],
					output_text: '',
					usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
				}),
			},
		} as unknown as OpenAI;
		const outcome = await runAgent({
			client,
			model: 'gpt-x',
			tools: [tool],
			state: initialState(),
			maxIterations: 2,
		});
		expect(outcome.status).toBe('max_iterations');
	});
});
