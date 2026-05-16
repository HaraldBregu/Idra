import { generateKeyPairSync, createSign } from 'node:crypto';
import {
	abortAuthorizedRuns,
	approveDevicePairing,
	authorizeFirstFrame,
	authorizeGatewayMethod,
	canonicalDevicePayload,
	canAbortRun,
	deviceIdFromPublicKey,
	deviceRequestNeedsApproval,
	issueDeviceToken,
	verifyDeviceSignedPayload,
	verifyDeviceToken,
	type ChatRunRecord,
	type PairedDevice,
} from '../../../../src/main/gateway';

describe('gateway authorization', () => {
	it('authorizes chat methods by operator scope and fails closed for unknown methods', () => {
		expect(authorizeGatewayMethod('chat.history', { scopes: ['operator.read'] })).toEqual({ ok: true });
		expect(authorizeGatewayMethod('chat.history', { scopes: ['operator.write'] })).toEqual({ ok: true });
		expect(authorizeGatewayMethod('chat.send', { scopes: ['operator.read'] })).toEqual({
			ok: false,
			reason: 'missing_scope',
			missingScope: 'operator.write',
		});
		expect(authorizeGatewayMethod('chat.abort', { scopes: ['operator.write'] })).toEqual({ ok: true });
		expect(authorizeGatewayMethod('unknown.method', { scopes: ['operator.write'] })).toEqual({
			ok: false,
			reason: 'missing_scope',
			missingScope: 'operator.admin',
		});
		expect(authorizeGatewayMethod('unknown.method', { scopes: ['operator.admin'] })).toEqual({ ok: true });
		expect(authorizeGatewayMethod('chat.send', { role: 'node', scopes: ['operator.admin'] })).toEqual({
			ok: false,
			reason: 'node_method_forbidden',
		});
	});

	it('allows abort by admin, same device, same connection, and legacy ownerless runs only', () => {
		expect(canAbortRun({ owner: { deviceId: 'd1' } }, { deviceId: 'd1' })).toBe(true);
		expect(canAbortRun({ owner: { connectionId: 'c1' } }, { connectionId: 'c1' })).toBe(true);
		expect(canAbortRun({ owner: { deviceId: 'd1', connectionId: 'c1' } }, { deviceId: 'd2', connectionId: 'c2' })).toBe(false);
		expect(canAbortRun({ owner: { deviceId: 'd1' } }, { scopes: ['operator.admin'] })).toBe(true);
		expect(canAbortRun({}, { connectionId: 'any' })).toBe(true);

		const aborted: string[] = [];
		const runs: ChatRunRecord[] = [
			{ runId: 'owned', owner: { deviceId: 'd1' }, abort: () => aborted.push('owned') },
			{ runId: 'other', owner: { deviceId: 'd2' }, abort: () => aborted.push('other') },
			{ runId: 'legacy', abort: () => aborted.push('legacy') },
		];
		expect(abortAuthorizedRuns(runs, { deviceId: 'd1' })).toEqual(['owned', 'legacy']);
		expect(aborted).toEqual(['owned', 'legacy']);
	});

	it('requires pairing approvers to hold granted operator scopes', () => {
		const request = {
			deviceId: 'device-1',
			publicKey: 'public',
			requestedRole: 'operator' as const,
			requestedScopes: ['operator.read', 'operator.write'] as const,
		};
		expect(approveDevicePairing({
			request,
			approver: { scopes: ['operator.pairing', 'operator.read'] },
		})).toEqual({
			ok: false,
			error: 'insufficient_grant_scopes',
			missingScopes: ['operator.write'],
		});

		const approved = approveDevicePairing({
			request,
			approver: { scopes: ['operator.admin'] },
		});
		expect(approved).toMatchObject({ ok: true });
		expect(approved.ok ? approved.value.approvedScopes.operator : []).toEqual(['operator.read', 'operator.write']);
	});

	it('verifies device tokens against role, revocation, token scopes, and device baseline', () => {
		const device: PairedDevice = {
			deviceId: 'device-1',
			publicKey: 'public',
			approvedRoles: ['operator'],
			approvedScopes: { operator: ['operator.read', 'operator.write'] },
			tokens: [
				{ id: 'token-1', deviceId: 'device-1', role: 'operator', scopes: ['operator.read'] },
				{ id: 'token-2', deviceId: 'device-1', role: 'operator', scopes: ['operator.write'], revoked: true },
			],
		};
		expect(verifyDeviceToken({ device, tokenId: 'token-1', role: 'operator', requestedScopes: ['operator.read'] })).toMatchObject({ ok: true });
		expect(verifyDeviceToken({ device, tokenId: 'token-1', role: 'operator', requestedScopes: ['operator.write'] })).toEqual({
			ok: false,
			error: 'requested_scope_exceeds_token',
		});
		expect(verifyDeviceToken({ device, tokenId: 'token-2', role: 'operator', requestedScopes: ['operator.write'] })).toEqual({
			ok: false,
			error: 'token_revoked',
		});
		expect(issueDeviceToken(device, {
			id: 'bad',
			deviceId: 'device-1',
			role: 'operator',
			scopes: ['operator.approvals'],
		})).toEqual({ ok: false, error: 'scope_not_approved' });
	});

	it('requires renewed approval for device scope upgrades', () => {
		const device: PairedDevice = {
			deviceId: 'device-1',
			publicKey: 'public',
			approvedRoles: ['operator'],
			approvedScopes: { operator: ['operator.read'] },
			tokens: [],
		};
		expect(deviceRequestNeedsApproval(device, {
			deviceId: 'device-1',
			publicKey: 'public',
			requestedRole: 'operator',
			requestedScopes: ['operator.read'],
		})).toBe(false);
		expect(deviceRequestNeedsApproval(device, {
			deviceId: 'device-1',
			publicKey: 'public',
			requestedRole: 'operator',
			requestedScopes: ['operator.write'],
		})).toBe(true);
	});

	it('requires connect as the first frame and clears unsafe self-declared scopes', () => {
		expect(authorizeFirstFrame({ method: 'chat.send', params: {} }, {})).toEqual({
			ok: false,
			error: 'connect_required',
		});
		expect(authorizeFirstFrame({
			method: 'connect',
			params: {
				mode: 'ui',
				requestedScopes: ['operator.admin'],
				auth: { type: 'trusted-proxy', userId: 'proxy-user' },
			},
		}, { trustedProxyUsers: ['proxy-user'] })).toEqual({
			ok: true,
			context: { role: 'operator', scopes: [] },
		});
		expect(authorizeFirstFrame({
			method: 'connect',
			params: {
				mode: 'local',
				requestedScopes: ['operator.read'],
				auth: { type: 'shared-token', token: 'secret' },
			},
		}, { sharedToken: 'secret' })).toEqual({
			ok: true,
			context: { role: 'operator', scopes: ['operator.read'] },
		});
	});

	it('verifies device signatures over the role and requested scopes', () => {
		const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
		const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
		const payload = {
			deviceId: deviceIdFromPublicKey(publicKey),
			clientId: 'client-1',
			mode: 'ui',
			role: 'operator' as const,
			scopes: ['operator.read'] as const,
			token: 'token-1',
			nonce: 'nonce',
			platform: 'darwin',
			deviceFamily: 'desktop',
			issuedAtMs: 1000,
		};
		const signer = createSign('sha256');
		signer.update(canonicalDevicePayload(payload));
		signer.end();
		const signatureBase64 = signer.sign(keys.privateKey, 'base64');

		expect(verifyDeviceSignedPayload({ publicKey, payload, signatureBase64, nowMs: 1000 })).toMatchObject({ ok: true });
		expect(verifyDeviceSignedPayload({
			publicKey,
			payload: { ...payload, scopes: ['operator.write'] },
			signatureBase64,
			nowMs: 1000,
		})).toEqual({ ok: false, error: 'invalid_signature' });
	});
});
