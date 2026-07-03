import type { AgentToolPermissionDecision } from '../../../shared/agent_types';

const pending = new Map<string, (decision: AgentToolPermissionDecision) => void>();

export function waitForToolPermission(toolCallId: string): Promise<AgentToolPermissionDecision> {
	return new Promise((resolve) => {
		pending.set(toolCallId, resolve);
	});
}

export function respondToolPermission(
	toolCallId: string,
	decision: AgentToolPermissionDecision
): boolean {
	const resolve = pending.get(toolCallId);
	if (!resolve) return false;
	pending.delete(toolCallId);
	resolve(decision);
	return true;
}

export function rejectPendingToolPermissions(): void {
	for (const resolve of pending.values()) resolve('reject');
	pending.clear();
}
