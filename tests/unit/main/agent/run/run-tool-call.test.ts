import { runToolCall } from '../../../../../src/main/agent/runner/run_tool_call';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import type { ToolCall } from '../../../../../src/main/agent/types';

describe('runToolCall', () => {
	it('propagates cancellation to the tool and stops waiting', async () => {
		const controller = new AbortController();
		let receivedSignal: AbortSignal | undefined;
		const tool = jsonTool({
			id: 'search_web',
			name: 'Search web',
			description: 'inspect',
			schema: { type: 'object' },
			execute: (_input, signal) => {
				receivedSignal = signal;
				return new Promise(() => undefined);
			},
		});
		const call: ToolCall = { id: 'tool-1', name: 'search_web', args: {} };
		const events = runToolCall(tool, call, controller.signal, undefined, { runId: 'run' });

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const pending = events.next();
		controller.abort(new Error('cancelled'));

		await expect(pending).rejects.toThrow('cancelled');
		expect(receivedSignal?.aborted).toBe(true);
		expect(call.result).toBeUndefined();
	});

	it('runs an allowed tool and records its result', async () => {
		const run = jest.fn().mockResolvedValue('done');
		const tool = jsonTool({
			id: 'inspect',
			name: 'Inspect',
			description: 'run',
			schema: { type: 'object' },
			execute: run,
		});
		const call: ToolCall = { id: 'tool-2', name: 'inspect', args: { value: 'one' } };
		const events = [];

		for await (const event of runToolCall(
			tool,
			call,
			new AbortController().signal,
			undefined,
			{ runId: 'run' }
		)) {
			events.push(event);
		}

		expect(run).toHaveBeenCalledWith({ value: 'one' }, expect.any(AbortSignal));
		expect(events).not.toContainEqual(expect.objectContaining({ type: 'tool_permission_request' }));
		expect(call.result).toMatchObject({ content: 'done', isError: undefined });
	});

	it('returns a tool error without leaking it as an operational failure', async () => {
		const tool = jsonTool({
			id: 'inspect',
			name: 'Inspect',
			description: 'run',
			schema: { type: 'object' },
			execute: () => {
				throw new Error('tool failed');
			},
		});
		const call: ToolCall = { id: 'tool-3', name: 'inspect', args: {} };

		for await (const _event of runToolCall(
			tool,
			call,
			new AbortController().signal,
			undefined,
			{ runId: 'run' }
		))
			void _event;

		expect(call.result).toMatchObject({ isError: true });
		expect(call.result?.content).toContain('tool failed');
	});
});
