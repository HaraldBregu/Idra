const resolveToolPermission = jest.fn();
const waitForToolPermission = jest.fn();
const getToolPermission = jest.fn(() => ({ default: 'ask', allow: [], deny: [], ask: [] }));
const setToolPermission = jest.fn();
const addPermissionRule = jest.fn();

jest.mock('../../../../../src/main/agent/permissions', () => ({
	resolveToolPermission: (...args: unknown[]) => resolveToolPermission(...args),
	waitForToolPermission: (...args: unknown[]) => waitForToolPermission(...args),
	getToolPermission: (...args: unknown[]) => getToolPermission(...args),
	setToolPermission: (...args: unknown[]) => setToolPermission(...args),
	addPermissionRule: (...args: unknown[]) => addPermissionRule(...args),
	toolApprovalTargets: () => [],
}));

jest.mock('../../../../../src/main/shared/agent_location', () => ({
	agentLocation: () => '/workspace',
}));

import { runToolCall } from '../../../../../src/main/agent/runner/run_tool_call';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import type { ToolCall } from '../../../../../src/main/agent/types';

function runnable(execute = jest.fn().mockResolvedValue('done')) {
	return {
		tool: jsonTool({
			id: 'restricted_tool',
			name: 'Restricted tool',
			description: 'run',
			schema: { type: 'object' },
			execute,
		}),
		execute,
	};
}

function call(id = 'tool-1'): ToolCall {
	return { id, name: 'restricted_tool', args: { value: id } };
}

describe('runToolCall run policy', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('uses the live default policy for stored allow and deny decisions', async () => {
		const { tool, execute } = runnable();
		resolveToolPermission.mockReturnValueOnce('allow').mockReturnValueOnce('deny');

		for await (const _event of runToolCall(tool, call('allow'), 'default')) void _event;
		for await (const _event of runToolCall(tool, call('deny'), 'default')) void _event;

		expect(resolveToolPermission).toHaveBeenCalledTimes(2);
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('denies ask immediately when a default run has no approval UI', async () => {
		const { tool, execute } = runnable();
		resolveToolPermission.mockReturnValue('ask');
		const events = [];

		for await (const event of runToolCall(tool, call(), 'default')) events.push(event);

		expect(execute).not.toHaveBeenCalled();
		expect(waitForToolPermission).not.toHaveBeenCalled();
		expect(events).not.toContainEqual(expect.objectContaining({ type: 'tool_permission_request' }));
	});

	it('emits one scoped request and persists always allow for an interactive default run', async () => {
		const { tool, execute } = runnable();
		resolveToolPermission.mockReturnValue('ask');
		waitForToolPermission.mockResolvedValue('approve_always');
		const events = [];

		for await (const event of runToolCall(tool, call(), 'default', undefined, undefined, {
			runId: 'run-1',
			windowId: 7,
		}))
			events.push(event);

		expect(events.filter((event) => event.type === 'tool_permission_request')).toHaveLength(1);
		expect(waitForToolPermission).toHaveBeenCalledWith(
			expect.objectContaining({ runId: 'run-1', toolName: 'restricted_tool', windowId: 7 }),
			undefined
		);
		expect(setToolPermission).toHaveBeenCalledWith(
			'restricted_tool',
			expect.objectContaining({ default: 'allow' })
		);
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('bypasses stored ask and deny without permission events or settings writes', async () => {
		const { tool, execute } = runnable();
		resolveToolPermission.mockReturnValue('deny');
		const events = [];

		for await (const event of runToolCall(tool, call(), 'background')) events.push(event);

		expect(resolveToolPermission).not.toHaveBeenCalled();
		expect(waitForToolPermission).not.toHaveBeenCalled();
		expect(setToolPermission).not.toHaveBeenCalled();
		expect(addPermissionRule).not.toHaveBeenCalled();
		expect(execute).toHaveBeenCalledTimes(1);
		expect(events).toContainEqual(
			expect.objectContaining({ type: 'tool_call_end', permissionOutcome: 'bypass' })
		);
	});
});
