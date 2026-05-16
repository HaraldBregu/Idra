import { HitlBridge } from '../../../src/main/hitl';
import { AgentRegistry } from '../../../src/main/registry';

describe('hitl bridge and agent registry', () => {
	it('tracks approvals and inputs until they are resolved or cancelled', async () => {
		const eventBus = { broadcast: jest.fn() };
		const hitl = new HitlBridge(eventBus as never, 'main');

		const approval = hitl.requestApproval({
			toolName: 'exec',
			question: 'Run?',
			args: { command: 'pwd', env: { API_KEY: 'secret', SAFE: 'value' } },
			runId: 'run-1',
			toolCallId: 'tool-1',
			derivedPaths: ['/workspace/README.md', '/workspace/README.md'],
		});
		const input = hitl.requestInput('Where?', ['a']);
		const pending = hitl.getPending();
		expect(pending.approvals).toHaveLength(1);
		expect(pending.inputs).toHaveLength(1);
		expect(pending.approvals[0]).toEqual(
			expect.objectContaining({
				kind: 'exec',
				toolName: 'exec',
				command: 'pwd',
				envKeys: ['API_KEY', 'SAFE'],
				runId: 'run-1',
				toolCallId: 'tool-1',
				derivedPaths: ['/workspace/README.md'],
				allowedDecisions: ['allow-once', 'allow-always', 'deny'],
			})
		);
		expect(pending.approvals[0]!.argsPreview).toEqual({
			command: 'pwd',
			env: { API_KEY: '[redacted]', SAFE: '[set]' },
		});

		expect(hitl.resolveApproval(pending.approvals[0]!.id, true)).toBe(true);
		expect(hitl.resolveInput(pending.inputs[0]!.id, 'a')).toBe(true);
		await expect(approval).resolves.toBe('allow-once');
		await expect(input).resolves.toBe('a');
		expect(hitl.hasPending()).toBe(false);
	});

	it('expires approvals and rejects duplicate resolution', async () => {
		jest.useFakeTimers();
		try {
			const hitl = new HitlBridge({ broadcast: jest.fn() } as never, 'main');
			const approval = hitl.requestApproval({
				toolName: 'write',
				question: 'Write?',
				args: {},
				timeoutMs: 10,
			});
			const id = hitl.getPending().approvals[0]!.id;
			jest.advanceTimersByTime(11);
			await expect(approval).resolves.toBeNull();
			expect(hitl.resolveApproval(id, 'allow-once')).toBe(false);
		} finally {
			jest.useRealTimers();
		}
	});

	it('waits on a resolved approval while it is retained briefly', async () => {
		const hitl = new HitlBridge({ broadcast: jest.fn() } as never, 'main');
		const approval = hitl.requestApproval({ toolName: 'write', question: 'Write?', args: {} });
		const id = hitl.getPending().approvals[0]!.id;
		expect(hitl.resolveApproval(id, 'allow-always')).toBe(true);
		await expect(approval).resolves.toBe('allow-always');
		await expect(hitl.waitApprovalDecision(id)).resolves.toBe('allow-always');
	});

	it('rejects all pending HITL requests on cancel', async () => {
		const hitl = new HitlBridge({ broadcast: jest.fn() } as never, 'main');
		const approval = hitl.requestApproval({ toolName: 'exec', question: 'Run?', args: {} });
		hitl.cancelAll('stop');
		await expect(approval).resolves.toBeNull();
	});

	it('registers agents by id and rejects duplicate ids', () => {
		const registry = new AgentRegistry();
		const agent = { id: 'main' };
		registry.register(agent as never);
		expect(registry.get('main')).toBe(agent);
		expect(registry.list()).toEqual(['main']);
		expect(() => registry.register(agent as never)).toThrow(/already registered/);
		expect(() => registry.get('missing')).toThrow(/Unknown agent/);
	});
});
