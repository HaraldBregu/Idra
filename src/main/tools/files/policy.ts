import type { PolicyServicePort } from '../../policy';
import type { Permission, PolicyDecision } from '../../../shared/policy';
import type { ToolContext } from '../core/types';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

export function checkFilePolicy(
	ctx: ToolContext,
	toolName: string,
	checks: readonly FilePolicyCheck[]
): string | null {
	const policy = (ctx.services as { policy?: PolicyServicePort } | undefined)?.policy;
	if (!policy) return null;

	for (const check of checks) {
		let decision: PolicyDecision;
		try {
			decision = policy.evaluate(check.path, check.permission);
		} catch (err) {
			return `${toolName}: file policy unavailable: ${(err as Error).message}`;
		}
		if (decision.outcome === 'allow') continue;
		return `${toolName}: denied by file policy for '${check.permission}' on ${decision.path}: ${decision.reason}`;
	}
	return null;
}
