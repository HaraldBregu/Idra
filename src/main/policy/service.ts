import path from 'node:path';
import type { PolicyConfig, PolicyDecision, Permission } from '../../shared/policy';
import { evaluate } from './evaluate';
import { PolicyStore, type PolicyStoreAccessor } from './store';
import {
	createToolPolicyIndex,
	evaluateToolApprovalPolicy,
	evaluateToolHookPolicy,
	evaluateToolPolicy,
	evaluateToolRequestPolicy,
	evaluateToolUsePolicy,
	expandToolPolicyEntries,
	expandToolPolicyProfile,
	globMatchToolPolicyEntry,
	toolUsePolicyKey,
	TOOL_POLICY_CORE_GROUPS,
	TOOL_POLICY_STAGE_ORDER,
	type ToolApprovalPolicyDecision,
	type ToolApprovalPolicyDecisionInput,
	type ToolHookPolicyDecision,
	type ToolHookPolicyInput,
	type ToolPolicy,
	type ToolPolicyEvaluation,
	type ToolPolicyEvaluationContext,
	type ToolPolicyIndex,
	type ToolPolicyProfile,
	type ToolPolicyStageName,
	type ToolPolicySubject,
	type ToolRequestPolicyDecision,
	type ToolRequestPolicyInput,
	type ToolUsePolicyDecision,
	type ToolUsePolicyInput,
} from './tools';

export type PolicyEvaluationLogger = {
	error(source: string, message: string, data?: unknown): void;
};

export type PolicyStoragePort = {
	getPolicy(): PolicyConfig;
	setPolicy(policy: PolicyConfig): PolicyConfig;
};

export interface PolicyServiceOptions {
	store?: PolicyStoragePort;
	storeAccessor?: PolicyStoreAccessor;
	workspaceRoot?: string;
	agentRoot?: string;
	logger?: PolicyEvaluationLogger;
}

export interface PolicyServicePort {
	getPolicy(): PolicyConfig;
	setPolicy(policy: PolicyConfig): PolicyConfig;
	evaluate(targetPath: string, permission: Permission): PolicyDecision;
	createToolUseKey(toolName: string, params: unknown): string;
	evaluateTools(
		subjects: readonly ToolPolicySubject[],
		context?: ToolPolicyEvaluationContext
	): ToolPolicyEvaluation;
	evaluateToolUse(input: ToolUsePolicyInput): ToolUsePolicyDecision;
	evaluateToolRequest(input: ToolRequestPolicyInput): ToolRequestPolicyDecision;
	evaluateToolHook(input: ToolHookPolicyInput): ToolHookPolicyDecision;
	evaluateToolApproval(input: ToolApprovalPolicyDecisionInput): ToolApprovalPolicyDecision;
}

export type PathPolicyInput = {
	targetPath: string;
	permission: Permission;
};

export type ToolAvailabilityPolicyInput = {
	subjects: readonly ToolPolicySubject[];
	context?: ToolPolicyEvaluationContext;
};

export interface PolicyRuleInputMap {
	path: PathPolicyInput;
	tools: ToolAvailabilityPolicyInput;
	toolUse: ToolUsePolicyInput;
	toolRequest: ToolRequestPolicyInput;
	toolHook: ToolHookPolicyInput;
	toolApproval: ToolApprovalPolicyDecisionInput;
}

export interface PolicyRuleDecisionMap {
	path: PolicyDecision;
	tools: ToolPolicyEvaluation;
	toolUse: ToolUsePolicyDecision;
	toolRequest: ToolRequestPolicyDecision;
	toolHook: ToolHookPolicyDecision;
	toolApproval: ToolApprovalPolicyDecision;
}

export type PolicyRuleName = keyof PolicyRuleInputMap;

export type PolicyRule<K extends PolicyRuleName> = (
	input: PolicyRuleInputMap[K]
) => PolicyRuleDecisionMap[K];

type PolicyRuleRegistry = {
	[K in PolicyRuleName]: PolicyRule<K>;
};

export class PolicyService implements PolicyServicePort {
	private store?: PolicyStoragePort;
	private readonly storeAccessor?: PolicyStoreAccessor;
	private readonly workspaceRoot?: string;
	private readonly agentRoot?: string;
	private readonly logger?: PolicyEvaluationLogger;
	private readonly rules: PolicyRuleRegistry = {
		path: (input) =>
			evaluate(this.getPolicy(), this.toVirtualPath(input.targetPath), input.permission),
		tools: (input) => evaluateToolPolicy(input.subjects, input.context),
		toolUse: (input) => evaluateToolUsePolicy(input),
		toolRequest: (input) => evaluateToolRequestPolicy(input),
		toolHook: (input) => evaluateToolHookPolicy(input),
		toolApproval: (input) => evaluateToolApprovalPolicy(input),
	};

	constructor(options: PolicyServiceOptions = {}) {
		this.store = options.store;
		this.storeAccessor = options.storeAccessor;
		this.workspaceRoot = options.workspaceRoot;
		this.agentRoot = options.agentRoot;
		this.logger = options.logger;
	}

	getPolicy(): PolicyConfig {
		return this.getStore().getPolicy();
	}

	setPolicy(policy: PolicyConfig): PolicyConfig {
		return this.getStore().setPolicy(policy);
	}

	evaluate(targetPath: string, permission: Permission): PolicyDecision {
		return this.evaluateRule('path', { targetPath, permission });
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

	createToolUseKey(toolName: string, params: unknown): string {
		return toolUsePolicyKey(toolName, params);
	}

	evaluateTools(
		subjects: readonly ToolPolicySubject[],
		context: ToolPolicyEvaluationContext = {}
	): ToolPolicyEvaluation {
		return this.evaluateRule('tools', { subjects, context });
	}

	evaluateToolUse(input: ToolUsePolicyInput): ToolUsePolicyDecision {
		return this.evaluateRule('toolUse', input);
	}

	evaluateToolRequest(input: ToolRequestPolicyInput): ToolRequestPolicyDecision {
		return this.evaluateRule('toolRequest', input);
	}

	evaluateToolHook(input: ToolHookPolicyInput): ToolHookPolicyDecision {
		return this.evaluateRule('toolHook', input);
	}

	evaluateToolApproval(input: ToolApprovalPolicyDecisionInput): ToolApprovalPolicyDecision {
		return this.evaluateRule('toolApproval', input);
	}

	registerRule<K extends PolicyRuleName>(name: K, rule: PolicyRule<K>): void {
		this.rules[name] = rule as PolicyRuleRegistry[K];
	}

	createToolPolicyIndex(subjects: readonly ToolPolicySubject[]): ToolPolicyIndex {
		return createToolPolicyIndex(subjects);
	}

	globMatchToolPolicyEntry(pattern: string, name: string): boolean {
		return globMatchToolPolicyEntry(pattern, name);
	}

	expandToolPolicyEntries(
		entries: readonly string[] | undefined,
		subjects: readonly ToolPolicySubject[],
		warnings?: string[],
		stage = 'policy'
	): Set<string> | undefined {
		return expandToolPolicyEntries(
			entries,
			this.createToolPolicyIndex(subjects),
			warnings,
			stage
		);
	}

	expandToolPolicyProfile(
		profile: ToolPolicyProfile | undefined,
		subjects: readonly ToolPolicySubject[],
		warnings?: string[],
		stage = 'profile'
	): Set<string> | undefined {
		return expandToolPolicyProfile(
			profile,
			this.createToolPolicyIndex(subjects),
			warnings,
			stage
		);
	}

	getToolPolicyStageOrder(): readonly ToolPolicyStageName[] {
		return TOOL_POLICY_STAGE_ORDER;
	}

	getCoreToolGroups(): Record<string, readonly string[]> {
		return TOOL_POLICY_CORE_GROUPS;
	}

	private getStore(): PolicyStoragePort {
		if (!this.store) {
			this.store = new PolicyStore(this.storeAccessor);
		}
		return this.store;
	}

	private evaluateRule<K extends PolicyRuleName>(
		name: K,
		input: PolicyRuleInputMap[K]
	): PolicyRuleDecisionMap[K] {
		try {
			return this.rules[name](input);
		} catch (error) {
			this.reportEvaluationError(name, error);
			throw error;
		}
	}

	private reportEvaluationError(name: PolicyRuleName, error: unknown): void {
		this.logger?.error('PolicyService', `Policy rule '${name}' evaluation failed`, {
			rule: name,
			error:
				error instanceof Error
					? { name: error.name, message: error.message, stack: error.stack }
					: error,
		});
	}
}

export type {
	PolicyStoreAccessor,
	ToolApprovalPolicyDecision,
	ToolApprovalPolicyDecisionInput,
	ToolHookPolicyDecision,
	ToolHookPolicyInput,
	ToolPolicy,
	ToolPolicyEvaluation,
	ToolPolicyEvaluationContext,
	ToolPolicyProfile,
	ToolPolicyStageName,
	ToolPolicySubject,
	ToolRequestPolicyDecision,
	ToolRequestPolicyInput,
	ToolUsePolicyDecision,
	ToolUsePolicyInput,
};
