import type {
	AgentToolPermissionDecision,
	AgentToolPermissionScope,
} from '../../../shared/agent_types';

export interface PendingToolApproval extends AgentToolPermissionScope {
	expiresAtMs: number;
	hardApproval: boolean;
	windowId?: number;
}

const pending = new Map<
	string,
	{
		request: PendingToolApproval;
		settle: (decision: AgentToolPermissionDecision) => void;
		timer: NodeJS.Timeout;
	}
>();

export function waitForToolPermission(
	request: PendingToolApproval,
	signal?: AbortSignal
): Promise<AgentToolPermissionDecision> {
	if (signal?.aborted) return Promise.resolve('reject');
	return new Promise((resolve) => {
		const delay = Math.max(0, request.expiresAtMs - Date.now());
		let timer: NodeJS.Timeout;
		let settled = false;
		const abort = (): void => settle('reject');
		const settle = (decision: AgentToolPermissionDecision): void => {
			if (settled) return;
			settled = true;
			pending.delete(request.approvalId);
			clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			resolve(decision);
		};
		timer = setTimeout(() => settle('reject'), delay);
		timer.unref?.();
		pending.get(request.approvalId)?.settle('reject');
		pending.set(request.approvalId, { request, settle, timer });
		signal?.addEventListener('abort', abort, { once: true });
		if (signal?.aborted) abort();
	});
}

export function respondToolPermission(
	scope: string | AgentToolPermissionScope,
	decision: AgentToolPermissionDecision,
	windowId?: number
): boolean {
	const approvalId = typeof scope === 'string' ? scope : scope.approvalId;
	const entry = pending.get(approvalId);
	if (!entry || entry.request.expiresAtMs <= Date.now()) return false;
	if (
		entry.request.windowId !== undefined &&
		(typeof scope === 'string' ||
			windowId !== entry.request.windowId ||
			scope.runId !== entry.request.runId ||
			scope.origin !== entry.request.origin ||
			scope.toolName !== entry.request.toolName ||
			scope.inputFingerprint !== entry.request.inputFingerprint)
	)
		return false;
	entry.settle(entry.request.hardApproval && decision === 'approve_always' ? 'approve' : decision);
	return true;
}

export function rejectPendingToolPermissions(runId?: string): void {
	for (const entry of pending.values()) {
		if (runId && entry.request.runId !== runId) continue;
		entry.settle('reject');
	}
}
