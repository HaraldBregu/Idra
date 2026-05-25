import type { PolicyConfig, PolicyDecision, Permission } from '../../shared/policy';
import { evaluate } from './evaluate';
import {
	evaluateToolPolicy,
	type ToolPolicyEvaluation,
	type ToolPolicyEvaluationContext,
	type ToolPolicySubject,
} from './tools';

export interface PolicyStorePort {
	getPolicy(): PolicyConfig;
}

export interface PolicyServicePort {
	evaluate(targetPath: string, permission: Permission): PolicyDecision;
	evaluateTools(
		subjects: readonly ToolPolicySubject[],
		context?: ToolPolicyEvaluationContext
	): ToolPolicyEvaluation;
}

export class PolicyService implements PolicyServicePort {
	constructor(private readonly store: PolicyStorePort) {}

	evaluate(targetPath: string, permission: Permission): PolicyDecision {
		return evaluate(this.store.getPolicy(), targetPath, permission);
	}

	evaluateTools(
		subjects: readonly ToolPolicySubject[],
		context: ToolPolicyEvaluationContext = {}
	): ToolPolicyEvaluation {
		return evaluateToolPolicy(subjects, context);
	}
}
