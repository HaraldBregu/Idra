import {
	waitForToolPermission,
	respondToolPermission,
	rejectPendingToolPermissions,
} from '../../../../../src/main/agent/policy/policy_pending';

describe('tool permission pending registry', () => {
	it('resolves a waiter with the delivered decision', async () => {
		const promise = waitForToolPermission('call-1');
		expect(respondToolPermission('call-1', 'approve')).toBe(true);
		await expect(promise).resolves.toBe('approve');
	});

	it('returns false when responding to an unknown call', () => {
		expect(respondToolPermission('missing', 'approve')).toBe(false);
	});

	it('does not resolve the same call twice', async () => {
		const promise = waitForToolPermission('call-2');
		respondToolPermission('call-2', 'reject');
		await promise;
		expect(respondToolPermission('call-2', 'approve')).toBe(false);
	});

	it('rejects all pending waiters', async () => {
		const a = waitForToolPermission('a');
		const b = waitForToolPermission('b');
		rejectPendingToolPermissions();
		await expect(a).resolves.toBe('reject');
		await expect(b).resolves.toBe('reject');
		expect(respondToolPermission('a', 'approve')).toBe(false);
	});
});
