import { ApprovalGateway } from '../../../../src/main/approval/gateway';

function request(gateway: ApprovalGateway, title = 'Approve?') {
	return gateway.request({
		kind: 'exec',
		title,
		requestPayload: { command: 'printf ok' },
		execBinding: {
			command: 'printf ok',
			rawCommand: 'printf ok',
			cwd: '/workspace',
			agentId: 'agent-1',
			sessionKey: 'session-1',
			envKeys: ['SAFE'],
		},
	});
}

describe('ApprovalGateway', () => {
	it('registers before waiters can resolve and emits request/resolution events', async () => {
		const events: unknown[] = [];
		const gateway = new ApprovalGateway((event) => events.push(event), () => 'aaaaaaaa-0000-4000-8000-000000000000');

		const approval = request(gateway);
		const wait = gateway.waitDecision('exec', approval.id);

		expect(gateway.list('exec')).toHaveLength(1);
		expect(events).toContainEqual(expect.objectContaining({ type: 'exec.approval.requested' }));
		expect(gateway.resolve('exec', approval.id, 'allow-once', 'operator-1')).toMatchObject({ ok: true });
		await expect(wait).resolves.toBe('allow-once');
		expect(events).toContainEqual(expect.objectContaining({ type: 'exec.approval.resolved' }));
	});

	it('resolves unambiguous slugs and rejects ambiguous slugs', () => {
		const ids = [
			'abc11111-0000-4000-8000-000000000000',
			'abc22222-0000-4000-8000-000000000000',
			'def11111-0000-4000-8000-000000000000',
		];
		const gateway = new ApprovalGateway(undefined, () => ids.shift()!);
		request(gateway, 'A');
		request(gateway, 'B');
		request(gateway, 'C');

		expect(gateway.resolve('exec', 'def', 'allow-once')).toMatchObject({ ok: true });
		expect(gateway.resolve('exec', 'abc', 'allow-once')).toEqual({ ok: false, error: 'ambiguous' });
	});

	it('routes plugin ids to plugin approvals and rejects plugin ids for exec approvals', () => {
		const gateway = new ApprovalGateway(undefined, () => 'aaaaaaaa-0000-4000-8000-000000000000');
		const plugin = gateway.request({
			kind: 'plugin',
			title: 'Plugin approval',
			requestPayload: { pluginId: 'demo' },
		});

		expect(plugin.id).toMatch(/^plugin:/);
		expect(gateway.resolve('exec', plugin.id, 'allow-once')).toEqual({ ok: false, error: 'wrong_kind' });
		expect(gateway.resolveAny(plugin.id, 'allow-once')).toMatchObject({ ok: true });
	});

	it('consumes allow-once exactly once', () => {
		const gateway = new ApprovalGateway(undefined, () => 'aaaaaaaa-0000-4000-8000-000000000000');
		const approval = request(gateway);

		expect(gateway.resolve('exec', approval.id, 'allow-once')).toMatchObject({ ok: true });
		expect(gateway.consumeAllowOnce('exec', approval.id)).toMatchObject({ ok: true });
		expect(gateway.consumeAllowOnce('exec', approval.id)).toEqual({
			ok: false,
			error: 'already_consumed',
		});
	});

	it('rejects mutated exec command or cwd after approval creation', () => {
		const gateway = new ApprovalGateway(undefined, () => 'aaaaaaaa-0000-4000-8000-000000000000');
		const approval = request(gateway);

		expect(gateway.assertExecBinding(approval.id, {
			command: 'printf ok',
			rawCommand: 'printf ok',
			cwd: '/workspace',
			agentId: 'agent-1',
			sessionKey: 'session-1',
			envKeys: ['SAFE'],
		})).toMatchObject({ ok: true });
		expect(gateway.assertExecBinding(approval.id, {
			command: 'printf changed',
			rawCommand: 'printf changed',
			cwd: '/workspace',
			agentId: 'agent-1',
			sessionKey: 'session-1',
			envKeys: ['SAFE'],
		})).toEqual({ ok: false, error: 'wrong_kind' });
	});

	it('fails closed on timeout', async () => {
		jest.useFakeTimers();
		try {
			const gateway = new ApprovalGateway(undefined, () => 'aaaaaaaa-0000-4000-8000-000000000000');
			const approval = gateway.request({
				kind: 'exec',
				title: 'Approve?',
				requestPayload: {},
				timeoutMs: 10,
			});
			const wait = gateway.waitDecision('exec', approval.id);

			jest.advanceTimersByTime(11);

			await expect(wait).resolves.toBe('timeout');
			expect(gateway.list('exec')).toHaveLength(0);
			expect(gateway.resolve('exec', approval.id, 'allow-once')).toEqual({
				ok: false,
				error: 'invalid_decision',
			});
		} finally {
			jest.useRealTimers();
		}
	});
});
