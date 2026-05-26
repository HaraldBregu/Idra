import path from 'node:path';
import type { PolicyConfig, PolicyDecision, Permission } from '../../shared/policy';
import { evaluate } from './evaluate';
import { PolicyStore } from './store';
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

export interface PolicyServiceOptions {
	store?: PolicyStore;
	workspaceRoot?: string;
	agentRoot?: string;
}

export interface PolicyServicePort {
	getPolicy(): PolicyConfig;
	setPolicy(policy: PolicyConfig): PolicyConfig;
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
	private readonly store: PolicyStore;
	private readonly workspaceRoot?: string;
	private readonly agentRoot?: string;

	constructor(options: PolicyServiceOptions = {}) {
		this.store = options.store ?? new PolicyStore();
		this.workspaceRoot = options.workspaceRoot;
		this.agentRoot = options.agentRoot;
	}

	getPolicy(): PolicyConfig {
		return this.store.getPolicy();
	}

	setPolicy(policy: PolicyConfig): PolicyConfig {
		return this.store.setPolicy(policy);
	}

	evaluate(targetPath: string, permission: Permission): PolicyDecision {
		return evaluate(this.getPolicy(), this.toVirtualPath(targetPath), permission);
	}

	// Maps real paths to virtual prefixes used in stored policy configs:
	// paths under agentRoot → /agent/..., paths under workspaceRoot → /workspace/...
	private toVirtualPath(targetPath: string): string {
		if (this.agentRoot) {
			const rel = path.relative(this.agentRoot, targetPath);
			if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
				return '/agent' + (rel ? '/' + rel : '');
			}
		}
		if (!this.workspaceRoot) return targetPath;
		const rel = path.relative(this.workspaceRoot, targetPath);
		if (rel.startsWith('..') || path.isAbsolute(rel)) return targetPath;
		return '/workspace' + (rel ? '/' + rel : '');
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
