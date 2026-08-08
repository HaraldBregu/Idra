import type { AgentToolPermissionDecision } from '../../../shared/agent_types';

export interface PendingToolApproval {
	approvalId: string;
	runId: string;
	origin: string;
	toolName: string;
	inputFingerprint: string;
	expiresAtMs: number;
	hardApproval: boolean;
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
	approvalId: string,
	decision: AgentToolPermissionDecision
): boolean {
	const entry = pending.get(approvalId);
	if (!entry || entry.request.expiresAtMs <= Date.now()) return false;
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
