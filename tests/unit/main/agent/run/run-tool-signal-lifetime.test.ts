import { runToolCall } from '../../../../../src/main/agent/run/run_tool_call';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';

it('clears the tool timeout while retaining parent-run cancellation after return', async () => {
	jest.useFakeTimers();
	try {
		let receivedSignal: AbortSignal | undefined;
		const tool = jsonTool({
			name: 'background_test',
			description: 'test',
			defaultPermission: 'allow',
			risk: 'low',
			effect: 'read',
			timeoutMs: 20,
			schema: { type: 'object' },
			execute: async (_input, signal) => {
				receivedSignal = signal;
				return 'started';
			},
		});
		const controller = new AbortController();
		for await (const _event of runToolCall(
			tool,
			{ id: 'call', name: tool.name, args: {} },
			false,
			controller.signal,
			undefined,
			'bypass'
		)) {
		}
		jest.advanceTimersByTime(100);
		expect(receivedSignal?.aborted).toBe(false);

		controller.abort(new Error('cancel parent run'));
		expect(receivedSignal?.aborted).toBe(true);
	} finally {
		jest.useRealTimers();
	}
});
