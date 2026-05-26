import type { PolicyConfig, PolicyDecision, Permission } from '../../shared/policy';
import { evaluate } from './evaluate';
import {
	evaluateToolApprovalPolicy,
	evaluateToolHookPolicy,
	evaluateToolPolicy,
	evaluateToolRequestPolicy,
	evaluateToolUsePolicy,
	type ToolApprovalPolicyDecision,
	type ToolApprovalPolicyDecisionInput,
	type ToolHookPolicyDecision,
	type ToolHookPolicyInput,
	type ToolPolicyEvaluation,
	type ToolPolicyEvaluationContext,
	type ToolPolicySubject,
	type ToolRequestPolicyDecision,
	type ToolRequestPolicyInput,
	type ToolUsePolicyDecision,
	type ToolUsePolicyInput,
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
	evaluateToolUse(input: ToolUsePolicyInput): ToolUsePolicyDecision;
	evaluateToolRequest(input: ToolRequestPolicyInput): ToolRequestPolicyDecision;
	evaluateToolHook(input: ToolHookPolicyInput): ToolHookPolicyDecision;
	evaluateToolApproval(input: ToolApprovalPolicyDecisionInput): ToolApprovalPolicyDecision;
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

	evaluateToolUse(input: ToolUsePolicyInput): ToolUsePolicyDecision {
		return evaluateToolUsePolicy(input);
	}

	evaluateToolRequest(input: ToolRequestPolicyInput): ToolRequestPolicyDecision {
		return evaluateToolRequestPolicy(input);
	}

	evaluateToolHook(input: ToolHookPolicyInput): ToolHookPolicyDecision {
		return evaluateToolHookPolicy(input);
	}

	evaluateToolApproval(input: ToolApprovalPolicyDecisionInput): ToolApprovalPolicyDecision {
		return evaluateToolApprovalPolicy(input);
	}
}
