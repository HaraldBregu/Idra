import { buildAgentSessionKey } from '../../../../src/main/agent';

describe('agent routing', () => {
	it('constructs stable session keys for task and subagent sessions', () => {
		expect(buildAgentSessionKey({ agentId: 'main', kind: 'task', id: 'abc 123' })).toBe(
			'agent:main:task:abc+123'
		);
		expect(buildAgentSessionKey({ agentId: 'research', kind: 'subagent', id: 'run-1' })).toBe(
			'agent:research:subagent:run-1'
		);
	});
});
