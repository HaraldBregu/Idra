import type { ConnectorTool } from '../../shared/connectors';

const HIGH_RISK_TERMS = [
	'delete',
	'remove',
	'write',
	'exec',
	'shell',
	'terminal',
	'command',
	'file',
	'filesystem',
	'credential',
	'secret',
	'token',
];

export function riskForTool(
	name: string,
	description: string | undefined,
	destructiveHint?: boolean
): ConnectorTool['risk'] {
	if (destructiveHint) return 'high';
	const haystack = `${name} ${description ?? ''}`.toLowerCase();
	return HIGH_RISK_TERMS.some((term) => haystack.includes(term)) ? 'high' : 'low';
}
