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
		resolve: (decision: AgentToolPermissionDecision) => void;
		timer: NodeJS.Timeout;
	}
>();

export function waitForToolPermission(
	request: PendingToolApproval
): Promise<AgentToolPermissionDecision> {
	return new Promise((resolve) => {
		const delay = Math.max(0, request.expiresAtMs - Date.now());
		const timer = setTimeout(() => {
			pending.delete(request.approvalId);
			resolve('reject');
		}, delay);
		timer.unref?.();
		pending.set(request.approvalId, { request, resolve, timer });
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
	pending.delete(approvalId);
	clearTimeout(entry.timer);
	entry.resolve(entry.request.hardApproval && decision === 'approve_always' ? 'approve' : decision);
	return true;
}

export function rejectPendingToolPermissions(): void {
	for (const entry of pending.values()) {
		clearTimeout(entry.timer);
		entry.resolve('reject');
	}
	pending.clear();
}
