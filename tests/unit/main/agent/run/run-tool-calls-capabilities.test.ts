import { runToolCalls } from '../../../../../src/main/agent/runner/run_tool_calls';
import type { Tool, ToolCall } from '../../../../../src/main/agent/types';

function fakeTool(name: string, output: string): Tool {
	return {
		id: name,
		name,
		description: name,
		schema: { type: 'object' },
		timeoutMs: 1_000,
		maxOutputBytes: 1_000,
		parseInput: () => ({}),
		run: () => output,
	};
}

describe('runToolCalls capability changes', () => {
	it('uses the current tool set for every call in a model batch', async () => {
		const load = fakeTool('load_skill', 'loaded');
		const write = fakeTool('write_file', 'wrote');
		const tools = [load, write];
		const calls: ToolCall[] = [
			{ id: '1', name: 'load_skill', args: {} },
			{ id: '2', name: 'write_file', args: {} },
		];
		const outputs: unknown[] = [];

		for await (const event of runToolCalls(
			tools,
			calls,
			new AbortController().signal,
			undefined,
			{ runId: 'run' }
		)) {
			if (event.type !== 'tool_call_end') continue;
			outputs.push(event.output);
			if (event.toolName === 'load_skill') tools.splice(0, tools.length, load);
		}

		expect(outputs).toEqual(['loaded', "Error: unknown tool 'write_file'"]);
	});
});
