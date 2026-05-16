import { hasOperatorScope, normalizeOperatorScopes, type OperatorScope } from './operator-scopes';
import { requiredScopeForMethod } from './method-scopes';

export type GatewayRole = 'operator' | 'node';

export type GatewayAuthContext = {
	role?: GatewayRole | string;
	scopes?: readonly string[];
	connectionId?: string;
	deviceId?: string;
};

export type GatewayAuthorizationResult =
	| { ok: true }
	| { ok: false; reason: 'unknown_role' | 'node_method_forbidden' | 'missing_scope'; missingScope?: OperatorScope | 'operator.admin' };

export function normalizeGatewayRole(role: unknown): GatewayRole | null {
	if (role === undefined || role === null || role === '') return 'operator';
	return role === 'operator' || role === 'node' ? role : null;
}

export function authorizeGatewayMethod(
	method: string,
	context: GatewayAuthContext
): GatewayAuthorizationResult {
	const role = normalizeGatewayRole(context.role);
	if (!role) return { ok: false, reason: 'unknown_role' };
	if (role === 'node') {
		return method.startsWith('node.') ? { ok: true } : { ok: false, reason: 'node_method_forbidden' };
	}

	const scopes = normalizeOperatorScopes(context.scopes);
	const required = requiredScopeForMethod(method);
	if (scopes.includes('operator.admin')) return { ok: true };
	if (required === 'operator.admin') {
		return { ok: false, reason: 'missing_scope', missingScope: 'operator.admin' };
	}
	if (hasOperatorScope(scopes, required)) return { ok: true };
	return { ok: false, reason: 'missing_scope', missingScope: required };
}

export function assertGatewayMethodAuthorized(method: string, context: GatewayAuthContext): void {
	const result = authorizeGatewayMethod(method, context);
	if (result.ok) return;
	const suffix = result.reason === 'missing_scope' ? `: ${result.missingScope}` : '';
	throw new Error(`Forbidden ${method}: ${result.reason}${suffix}`);
}
