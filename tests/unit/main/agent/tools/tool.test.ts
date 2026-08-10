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

it('forwards internal coordination metadata without exposing it in the schema', () => {
	const targets = jest.fn(() => ['/workspace/a']);
	const coordinated = jsonTool({
		name: 'coordinated',
		description: 'read safely',
		schema: { type: 'object' },
		exclusiveTargets: targets,
		parallelSafe: true,
		execute: () => undefined,
	});

	expect(coordinated.parallelSafe).toBe(true);
	expect(coordinated.exclusiveTargets?.({})).toEqual(['/workspace/a']);
	expect(coordinated.schema).toEqual({ type: 'object' });
});
