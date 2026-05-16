import type { OperatorScope } from './operator-scopes';

export type GatewayMethodRequirement = OperatorScope | 'operator.admin';

const METHOD_SCOPES: Record<string, GatewayMethodRequirement> = {
	'chat.history': 'operator.read',
	'chat.send': 'operator.write',
	'chat.abort': 'operator.write',
	'approvals.list': 'operator.approvals',
	'approvals.resolve': 'operator.approvals',
	'approvals.get': 'operator.approvals',
	'devices.list': 'operator.pairing',
	'devices.requestPairing': 'operator.pairing',
	'devices.approvePairing': 'operator.pairing',
	'devices.revokeToken': 'operator.pairing',
	'devices.rotateToken': 'operator.pairing',
	'talk.secrets.read': 'operator.talk.secrets',
	'talk.secrets.write': 'operator.talk.secrets',
};

export function requiredScopeForMethod(method: string): GatewayMethodRequirement {
	return METHOD_SCOPES[method] ?? 'operator.admin';
}

export function setMethodScope(
	method: string,
	requirement: GatewayMethodRequirement
): Record<string, GatewayMethodRequirement> {
	return { ...METHOD_SCOPES, [method]: requirement };
}
