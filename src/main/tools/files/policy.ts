import { PolicyService, type PolicyStorePort } from '../../policy';
import type { Permission } from '../../../shared/policy';
import type { FridayServices, ToolContext } from '../core/types';

export interface FilePolicyCheck {
	path: string;
	permission: Permission;
}

export function checkFilePolicy(
	ctx: ToolContext,
	toolName: string,
	checks: readonly FilePolicyCheck[]
): string | null {
	const store = (ctx.services as Partial<FridayServices> | undefined)?.store as
		| Partial<PolicyStorePort>
		| undefined;
	if (typeof store?.getPolicy !== 'function') return null;
	const policy = new PolicyService(store as PolicyStorePort);

	for (const check of checks) {
		let decision;
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
