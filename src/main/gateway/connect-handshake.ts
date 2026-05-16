import { normalizeOperatorScopes, type OperatorScope } from './operator-scopes';
import { normalizeGatewayRole, type GatewayAuthContext, type GatewayRole } from './role-policy';
import { verifyDeviceToken, type PairedDevice } from './device-authorization';

export type ConnectAuth =
	| { type: 'none' }
	| { type: 'shared-token'; token: string }
	| { type: 'password'; password: string }
	| { type: 'trusted-proxy'; userId: string }
	| { type: 'tailscale'; login: string; path: string }
	| { type: 'bootstrap-token'; token: string }
	| { type: 'device-token'; deviceId: string; tokenId: string };

export type ConnectRequest = {
	method: 'connect';
	params: {
		mode: string;
		role?: GatewayRole | string;
		requestedScopes?: string[];
		auth: ConnectAuth;
	};
};

export type ConnectHandshakeConfig = {
	allowUnauthenticated?: boolean;
	sharedToken?: string;
	password?: string;
	trustedProxyUsers?: readonly string[];
	allowTailscaleWebUi?: boolean;
	bootstrapToken?: string;
	devices?: readonly PairedDevice[];
};

export type ConnectHandshakeResult =
	| { ok: true; context: GatewayAuthContext }
	| { ok: false; error: string };

export function authorizeFirstFrame(
	frame: unknown,
	config: ConnectHandshakeConfig
): ConnectHandshakeResult {
	if (!isConnectRequest(frame)) return { ok: false, error: 'connect_required' };
	const role = normalizeGatewayRole(frame.params.role);
	if (!role) return { ok: false, error: 'unknown_role' };
	const requestedScopes = normalizeOperatorScopes(frame.params.requestedScopes);
	const auth = frame.params.auth;

	if (auth.type === 'none') {
		if (!config.allowUnauthenticated) return { ok: false, error: 'unauthenticated_not_allowed' };
		return { ok: true, context: { role, scopes: requestedScopes } };
	}
	if (auth.type === 'shared-token') {
		if (!config.sharedToken || auth.token !== config.sharedToken) return { ok: false, error: 'invalid_token' };
		return { ok: true, context: { role, scopes: requestedScopes } };
	}
	if (auth.type === 'password') {
		if (!config.password || auth.password !== config.password) return { ok: false, error: 'invalid_password' };
		return { ok: true, context: { role, scopes: requestedScopes } };
	}
	if (auth.type === 'trusted-proxy') {
		if (!config.trustedProxyUsers?.includes(auth.userId)) return { ok: false, error: 'invalid_proxy_user' };
		return { ok: true, context: { role, scopes: [] } };
	}
	if (auth.type === 'tailscale') {
		if (!config.allowTailscaleWebUi || !auth.path.startsWith('/ui')) {
			return { ok: false, error: 'invalid_tailscale_context' };
		}
		return { ok: true, context: { role, scopes: [] } };
	}
	if (auth.type === 'bootstrap-token') {
		if (!config.bootstrapToken || auth.token !== config.bootstrapToken) return { ok: false, error: 'invalid_bootstrap_token' };
		return { ok: true, context: { role, scopes: requestedScopes } };
	}
	const device = config.devices?.find((candidate) => candidate.deviceId === auth.deviceId);
	if (!device) return { ok: false, error: 'device_not_found' };
	const verified = verifyDeviceToken({
		device,
		tokenId: auth.tokenId,
		role,
		requestedScopes: requestedScopes as OperatorScope[],
	});
	if (!verified.ok) return { ok: false, error: verified.error };
	return {
		ok: true,
		context: {
			role,
			scopes: requestedScopes,
			deviceId: auth.deviceId,
		},
	};
}

function isConnectRequest(value: unknown): value is ConnectRequest {
	if (!value || typeof value !== 'object') return false;
	const record = value as Partial<ConnectRequest>;
	if (record.method !== 'connect') return false;
	const params = record.params as Partial<ConnectRequest['params']> | undefined;
	if (!params || typeof params.mode !== 'string') return false;
	const auth = params.auth as Partial<ConnectAuth> | undefined;
	return Boolean(auth && typeof auth.type === 'string');
}
