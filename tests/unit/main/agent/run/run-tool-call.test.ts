import { runToolCall } from '../../../../../src/main/agent/run/run_tool_call';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import type { ToolCall } from '../../../../../src/main/agent/types';

describe('runToolCall', () => {
	it('propagates cancellation to the tool and stops waiting', async () => {
		const controller = new AbortController();
		let receivedSignal: AbortSignal | undefined;
		const tool = jsonTool({
			name: 'web_search',
			description: 'inspect',
			schema: { type: 'object' },
			execute: (_input, signal) => {
				receivedSignal = signal;
				return new Promise(() => undefined);
			},
		});
		const call: ToolCall = { id: 'tool-1', name: 'web_search', args: {} };
		const events = runToolCall(tool, call, false, controller.signal);

		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const pending = events.next();
		controller.abort(new Error('cancelled'));

		await expect(pending).rejects.toThrow('cancelled');
		expect(receivedSignal?.aborted).toBe(true);
		expect(call.result).toBeUndefined();
	});

	it('bypasses policy checks only when explicitly requested', async () => {
		const run = jest.fn().mockResolvedValue('done');
		const tool = jsonTool({
			name: 'restricted_tool',
			description: 'run',
			schema: { type: 'object' },
			defaultPermission: 'ask',
			execute: run,
		});
		const call: ToolCall = {
			id: 'tool-1',
			name: 'restricted_tool',
			args: { command: 'echo done' },
		};
		const events = [];

		for await (const event of runToolCall(tool, call, false, undefined, undefined, 'bypass')) {
			events.push(event);
		}

		expect(run).toHaveBeenCalledWith({ command: 'echo done' }, expect.any(AbortSignal));
		expect(events).not.toContainEqual(expect.objectContaining({ type: 'tool_permission_request' }));

		const restrictedCall: ToolCall = {
			id: 'tool-2',
			name: 'restricted_tool',
			args: { command: 'echo blocked' },
		};
		for await (const event of runToolCall(tool, restrictedCall, false)) events.push(event);
		expect(run).toHaveBeenCalledTimes(1);
		expect(restrictedCall.result).toMatchObject({ isError: true });
	});
});
