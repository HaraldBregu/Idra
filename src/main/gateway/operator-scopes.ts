export const OPERATOR_SCOPES = [
	'operator.admin',
	'operator.read',
	'operator.write',
	'operator.approvals',
	'operator.pairing',
	'operator.talk.secrets',
] as const;

export type OperatorScope = (typeof OPERATOR_SCOPES)[number];

const OPERATOR_SCOPE_SET = new Set<string>(OPERATOR_SCOPES);

export function isOperatorScope(value: unknown): value is OperatorScope {
	return typeof value === 'string' && OPERATOR_SCOPE_SET.has(value);
}

export function normalizeOperatorScopes(values: readonly unknown[] | undefined): OperatorScope[] {
	const scopes = new Set<OperatorScope>();
	for (const value of values ?? []) {
		if (isOperatorScope(value)) scopes.add(value);
	}
	return [...scopes];
}

export function hasOperatorScope(scopes: readonly OperatorScope[], required: OperatorScope): boolean {
	if (scopes.includes('operator.admin')) return true;
	if (required === 'operator.read' && scopes.includes('operator.write')) return true;
	return scopes.includes(required);
}

export function missingOperatorScopes(
	granterScopes: readonly OperatorScope[],
	grantedScopes: readonly OperatorScope[]
): OperatorScope[] {
	if (granterScopes.includes('operator.admin')) return [];
	return grantedScopes.filter((scope) => !hasOperatorScope(granterScopes, scope));
}
