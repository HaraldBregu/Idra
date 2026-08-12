import { filterPlanTools } from '../../../../../src/main/agent/runner/run_plan_tools';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';

const candidate = (id: string, planSafe?: boolean) =>
	jsonTool({
		id,
		name: id,
		description: id,
		planSafe,
		schema: { type: 'object' },
		execute: () => undefined,
	});

describe('Plan tool filtering', () => {
	it('fails closed for unclassified tools', () => {
		const safe = candidate('read', true);
		const unsafe = candidate('write');
		expect(filterPlanTools([safe, unsafe], 'plan')).toEqual([safe]);
	});

	it('does not change Default mode tools', () => {
		const tools = [candidate('read', true), candidate('write')];
		expect(filterPlanTools(tools, 'default')).toBe(tools);
	});
});
