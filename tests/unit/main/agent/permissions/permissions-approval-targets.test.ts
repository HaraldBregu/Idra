import path from 'node:path';
import { toolApprovalTargets } from '../../../../../src/main/agent/permissions/tool_approval_targets';

const agentDir = path.resolve('/appdata/agent');

describe('toolApprovalTargets', () => {
	it('stores the containing folder for read', () => {
		expect(toolApprovalTargets('read', { path: '/workspace/a.txt' }, agentDir)).toEqual([
			path.resolve('/workspace'),
		]);
	});

	it('keeps exact targets for write and exec', () => {
		expect(toolApprovalTargets('write', { path: '/workspace/a.txt' }, agentDir)).toEqual([
			path.resolve('/workspace/a.txt'),
		]);
		expect(toolApprovalTargets('exec', { command: 'npm test' }, agentDir)).toEqual(['npm test']);
	});
});
