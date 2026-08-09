import { jsonTool } from '../../../../../src/main/agent/tools/tool';

it('does not cut native tools off at thirty seconds by default', () => {
	const nativeTool = jsonTool({
		name: 'long_operation',
		description: 'Long operation',
		schema: { type: 'object' },
		execute: () => undefined,
	});

	expect(nativeTool.timeoutMs).toBe(10 * 60_000);
});
