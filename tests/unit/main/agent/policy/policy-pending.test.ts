import {
	waitForToolPermission,
	respondToolPermission,
	rejectPendingToolPermissions,
	type PendingToolApproval,
} from '../../../../../src/main/agent/policy/policy_pending';

const approval = (approvalId: string, hardApproval = false): PendingToolApproval => ({
	approvalId,
	runId: 'run-1',
	origin: 'main',
	toolName: 'inspect',
	inputFingerprint: 'fingerprint',
	expiresAtMs: Date.now() + 10_000,
	hardApproval,
});

describe('tool permission pending registry', () => {
	afterEach(() => rejectPendingToolPermissions());

	it('resolves a waiter with the delivered decision', async () => {
		const promise = waitForToolPermission(approval('call-1'));
		expect(respondToolPermission('call-1', 'approve')).toBe(true);
		await expect(promise).resolves.toBe('approve');
	});

	it('returns false when responding to an unknown call', () => {
		expect(respondToolPermission('missing', 'approve')).toBe(false);
	});

	it('does not resolve the same call twice', async () => {
		const promise = waitForToolPermission(approval('call-2'));
		respondToolPermission('call-2', 'reject');
		await promise;
		expect(respondToolPermission('call-2', 'approve')).toBe(false);
	});

	it('rejects all pending waiters', async () => {
		const a = waitForToolPermission(approval('a'));
		const b = waitForToolPermission(approval('b'));
		rejectPendingToolPermissions();
		await expect(a).resolves.toBe('reject');
		await expect(b).resolves.toBe('reject');
		expect(respondToolPermission('a', 'approve')).toBe(false);
	});

	it('does not persist an always-allow decision for a hard approval', async () => {
		const promise = waitForToolPermission(approval('hard', true));
		expect(respondToolPermission('hard', 'approve_always')).toBe(true);
		await expect(promise).resolves.toBe('approve');
	});

	it('accepts a response only from the originating window with the exact approval scope', async () => {
		const request = { ...approval('window-bound'), windowId: 41 };
		const promise = waitForToolPermission(request);
		const scope = {
			approvalId: request.approvalId,
			runId: request.runId,
			origin: request.origin,
			toolName: request.toolName,
			inputFingerprint: request.inputFingerprint,
		};

		expect(respondToolPermission(scope, 'approve', 42)).toBe(false);
		expect(respondToolPermission({ ...scope, runId: 'other-run' }, 'approve', 41)).toBe(false);
		expect(respondToolPermission(scope, 'approve', 41)).toBe(true);
		await expect(promise).resolves.toBe('approve');
	});

	it('removes only the waiter whose run signal is aborted', async () => {
		const controller = new AbortController();
		const cancelled = waitForToolPermission(approval('cancelled'), controller.signal);
		const otherRequest = { ...approval('other'), runId: 'run-2' };
		const other = waitForToolPermission(otherRequest);
		controller.abort();

		await expect(cancelled).resolves.toBe('reject');
		expect(respondToolPermission('cancelled', 'approve')).toBe(false);
		expect(respondToolPermission('other', 'approve')).toBe(true);
		await expect(other).resolves.toBe('approve');
	});

	it('rejects pending approvals for only the requested run', async () => {
		const selected = waitForToolPermission(approval('selected'));
		const other = waitForToolPermission({ ...approval('other-run'), runId: 'run-2' });
		rejectPendingToolPermissions('run-1');

		await expect(selected).resolves.toBe('reject');
		expect(respondToolPermission('other-run', 'approve')).toBe(true);
		await expect(other).resolves.toBe('approve');
	});
});
