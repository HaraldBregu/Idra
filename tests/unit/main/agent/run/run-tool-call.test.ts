import { runToolCall } from '../../../../../src/main/agent/run/run_tool_call';
import type { Tool, ToolCall } from '../../../../../src/main/agent/types';

describe('runToolCall', () => {
	it('propagates cancellation to the tool and stops waiting', async () => {
		const controller = new AbortController();
		let receivedSignal: AbortSignal | undefined;
		const tool: Tool = {
			name: 'web_search',
			description: 'inspect',
			schema: { type: 'object' },
			run: (_input, signal) => {
				receivedSignal = signal;
				return new Promise(() => undefined);
			},
		};
		const call: ToolCall = { id: 'tool-1', name: 'web_search', args: {} };
		const events = runToolCall(tool, call, false, controller.signal);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const pending = events.next();
		controller.abort(new Error('cancelled'));

		await expect(pending).rejects.toThrow('cancelled');
		expect(receivedSignal).toBe(controller.signal);
		expect(call.result).toBeUndefined();
	});

	it('bypasses policy checks only when explicitly requested', async () => {
		const run = jest.fn().mockResolvedValue('done');
		const tool: Tool = {
			name: 'exec',
			description: 'run',
			schema: { type: 'object' },
			defaultPermission: 'ask',
			run,
		};
		const call: ToolCall = { id: 'tool-1', name: 'exec', args: { command: 'echo done' } };
		const events = [];

		for await (const event of runToolCall(tool, call, false, undefined, undefined, 'bypass')) {
			events.push(event);
		}

		expect(run).toHaveBeenCalledWith({ command: 'echo done' }, undefined);
		expect(events).not.toContainEqual(expect.objectContaining({ type: 'tool_permission_request' }));
	});
});
