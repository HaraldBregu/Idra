import type { AgentRouteSessionScope } from '../../../shared/store';

export const SESSION_SCOPES = new Set<AgentRouteSessionScope>([
	'main',
	'per-peer',
	'per-channel-peer',
	'per-account-channel-peer',
]);
