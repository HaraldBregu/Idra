import { normalizeOperatorScopes, type OperatorScope } from './operator-scopes';

export type ChatRunOwner = {
	connectionId?: string;
	deviceId?: string;
};

export type ChatAbortRequester = {
	connectionId?: string;
	deviceId?: string;
	scopes?: readonly string[];
};

export type ChatRunRecord = {
	runId: string;
	owner?: ChatRunOwner;
	abort: () => void;
};

export function canAbortRun(run: Pick<ChatRunRecord, 'owner'>, requester: ChatAbortRequester): boolean {
	const scopes = normalizeOperatorScopes(requester.scopes);
	if (scopes.includes('operator.admin')) return true;
	if (!run.owner || (!run.owner.connectionId && !run.owner.deviceId)) return true;
	if (requester.deviceId && run.owner.deviceId && requester.deviceId === run.owner.deviceId) return true;
	return Boolean(
		requester.connectionId &&
			run.owner.connectionId &&
			requester.connectionId === run.owner.connectionId
	);
}

export function abortAuthorizedRuns(
	runs: Iterable<ChatRunRecord>,
	requester: ChatAbortRequester
): string[] {
	const aborted: string[] = [];
	for (const run of runs) {
		if (!canAbortRun(run, requester)) continue;
		run.abort();
		aborted.push(run.runId);
	}
	return aborted;
}

export function requireAdminForChatProvenance(scopes: readonly string[] | undefined): void {
	if (normalizeOperatorScopes(scopes).includes('operator.admin')) return;
	throw new Error('Forbidden chat.send field: operator.admin required for system provenance');
}

export function isOperatorScopeList(values: readonly string[] | undefined): values is OperatorScope[] {
	return normalizeOperatorScopes(values).length === (values?.length ?? 0);
}
