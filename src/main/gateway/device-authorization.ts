import { createHash, createVerify } from 'node:crypto';
import { missingOperatorScopes, normalizeOperatorScopes, type OperatorScope } from './operator-scopes';
import { normalizeGatewayRole, type GatewayRole, type GatewayAuthContext } from './role-policy';

export type PendingDevicePairing = {
	deviceId: string;
	publicKey: string;
	requestedRole: GatewayRole;
	requestedScopes: OperatorScope[];
};

export type PairedDevice = {
	deviceId: string;
	publicKey: string;
	approvedRoles: GatewayRole[];
	approvedScopes: Partial<Record<GatewayRole, OperatorScope[]>>;
	tokens: DeviceToken[];
};

export type DeviceToken = {
	id: string;
	deviceId: string;
	role: GatewayRole;
	scopes: OperatorScope[];
	revoked?: boolean;
};

export type DeviceAuthorizationResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: string; missingScopes?: OperatorScope[] };

export function approveDevicePairing(input: {
	request: PendingDevicePairing;
	approver: GatewayAuthContext;
	existing?: PairedDevice;
}): DeviceAuthorizationResult<PairedDevice> {
	const approverScopes = normalizeOperatorScopes(input.approver.scopes);
	if (!approverScopes.includes('operator.admin') && !approverScopes.includes('operator.pairing')) {
		return { ok: false, error: 'forbidden', missingScopes: ['operator.pairing'] };
	}
	const role = normalizeGatewayRole(input.request.requestedRole);
	if (!role) return { ok: false, error: 'invalid_role' };
	if (role !== 'operator' && input.request.requestedScopes.length > 0) {
		return { ok: false, error: 'invalid_role_scope_combination' };
	}
	const requestedScopes = normalizeOperatorScopes(input.request.requestedScopes);
	if (requestedScopes.length !== input.request.requestedScopes.length) {
		return { ok: false, error: 'invalid_scope' };
	}
	const missing = missingOperatorScopes(approverScopes, requestedScopes);
	if (missing.length > 0) return { ok: false, error: 'insufficient_grant_scopes', missingScopes: missing };

	const existing = input.existing;
	const approvedRoles = new Set<GatewayRole>(existing?.approvedRoles ?? []);
	approvedRoles.add(role);
	const approvedScopes = { ...(existing?.approvedScopes ?? {}) };
	const roleScopes = new Set<OperatorScope>(approvedScopes[role] ?? []);
	requestedScopes.forEach((scope) => roleScopes.add(scope));
	approvedScopes[role] = [...roleScopes];
	return {
		ok: true,
		value: {
			deviceId: input.request.deviceId,
			publicKey: input.request.publicKey,
			approvedRoles: [...approvedRoles],
			approvedScopes,
			tokens: existing?.tokens ?? [],
		},
	};
}

export function issueDeviceToken(
	device: PairedDevice,
	token: DeviceToken
): DeviceAuthorizationResult<DeviceToken> {
	if (token.deviceId !== device.deviceId) return { ok: false, error: 'device_mismatch' };
	if (!device.approvedRoles.includes(token.role)) return { ok: false, error: 'role_not_approved' };
	if (!isSubset(token.scopes, device.approvedScopes[token.role] ?? [])) {
		return { ok: false, error: 'scope_not_approved' };
	}
	return { ok: true, value: { ...token, scopes: [...token.scopes] } };
}

export function verifyDeviceToken(input: {
	device: PairedDevice;
	tokenId: string;
	role: GatewayRole;
	requestedScopes: readonly OperatorScope[];
}): DeviceAuthorizationResult<DeviceToken> {
	const token = input.device.tokens.find((candidate) => candidate.id === input.tokenId);
	if (!token) return { ok: false, error: 'token_not_found' };
	if (token.deviceId !== input.device.deviceId) return { ok: false, error: 'device_mismatch' };
	if (token.role !== input.role) return { ok: false, error: 'role_mismatch' };
	if (token.revoked) return { ok: false, error: 'token_revoked' };
	if (!isSubset(token.scopes, input.device.approvedScopes[input.role] ?? [])) {
		return { ok: false, error: 'token_scope_exceeds_device' };
	}
	if (!isSubset(input.requestedScopes, token.scopes)) {
		return { ok: false, error: 'requested_scope_exceeds_token' };
	}
	return { ok: true, value: token };
}

export function deviceRequestNeedsApproval(device: PairedDevice, request: PendingDevicePairing): boolean {
	if (!device.approvedRoles.includes(request.requestedRole)) return true;
	return !isSubset(request.requestedScopes, device.approvedScopes[request.requestedRole] ?? []);
}

export type DeviceSignedPayload = {
	deviceId: string;
	clientId?: string;
	mode?: string;
	role: GatewayRole;
	scopes: OperatorScope[];
	token?: string;
	nonce: string;
	platform?: string;
	deviceFamily?: string;
	issuedAtMs: number;
};

export function deviceIdFromPublicKey(publicKey: string): string {
	return createHash('sha256').update(publicKey).digest('base64url');
}

export function verifyDeviceSignedPayload(input: {
	publicKey: string;
	payload: DeviceSignedPayload;
	signatureBase64: string;
	nowMs?: number;
	maxAgeMs?: number;
}): DeviceAuthorizationResult<DeviceSignedPayload> {
	if (input.payload.deviceId !== deviceIdFromPublicKey(input.publicKey)) {
		return { ok: false, error: 'device_id_mismatch' };
	}
	const now = input.nowMs ?? Date.now();
	const maxAgeMs = input.maxAgeMs ?? 5 * 60_000;
	if (Math.abs(now - input.payload.issuedAtMs) > maxAgeMs) return { ok: false, error: 'signature_stale' };
	const verifier = createVerify('sha256');
	verifier.update(canonicalDevicePayload(input.payload));
	verifier.end();
	if (!verifier.verify(input.publicKey, input.signatureBase64, 'base64')) {
		return { ok: false, error: 'invalid_signature' };
	}
	return { ok: true, value: input.payload };
}

export function canonicalDevicePayload(payload: DeviceSignedPayload): string {
	return JSON.stringify({
		deviceId: payload.deviceId,
		clientId: payload.clientId,
		mode: payload.mode,
		role: payload.role,
		scopes: [...payload.scopes].sort(),
		token: payload.token,
		nonce: payload.nonce,
		platform: payload.platform,
		deviceFamily: payload.deviceFamily,
		issuedAtMs: payload.issuedAtMs,
	});
}

function isSubset<T>(values: readonly T[], baseline: readonly T[]): boolean {
	return values.every((value) => baseline.includes(value));
}
