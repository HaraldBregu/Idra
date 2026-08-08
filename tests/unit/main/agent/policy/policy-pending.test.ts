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
});
