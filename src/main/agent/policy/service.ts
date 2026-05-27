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
	debug?(source: string, message: string, data?: unknown): void;
	info?(source: string, message: string, data?: unknown): void;
	warn?(source: string, message: string, data?: unknown): void;
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
	registerRule<K extends PolicyRuleName>(name: K, rule: PolicyRule<K>): void;
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
		this.logger?.info?.('PolicyService', 'Policy service initialized', {
			workspaceRoot: this.workspaceRoot,
			agentRoot: this.agentRoot,
		});
	}

	getPolicy(): PolicyConfig {
		return this.getStore().getPolicy();
	}

	setPolicy(policy: PolicyConfig): PolicyConfig {
		try {
			const updated = this.getStore().setPolicy(policy);
			this.logger?.info?.('PolicyService', 'Policy updated', this.describePolicy(updated));
			return updated;
		} catch (error) {
			this.reportPolicyUpdateError(error);
			throw error;
		}
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
		this.logger?.info?.('PolicyService', 'Policy rule registered', { rule: name });
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
			const decision = this.rules[name](input);
			this.reportEvaluationResult(name, decision);
			return decision;
		} catch (error) {
			this.reportEvaluationError(name, error);
			throw error;
		}
	}

	private describePolicy(policy: PolicyConfig): Record<string, unknown> {
		return {
			version: policy.version,
			defaultPolicy: policy.defaultPolicy,
			pathCount: policy.paths.length,
		};
	}

	private reportEvaluationResult(
		name: PolicyRuleName,
		decision: PolicyRuleDecisionMap[PolicyRuleName]
	): void {
		const data = this.describeDecision(decision);
		if (this.isDeniedDecision(decision)) {
			this.logger?.warn?.('PolicyService', `Policy rule '${name}' denied`, data);
			return;
		}
		this.logger?.debug?.('PolicyService', `Policy rule '${name}' evaluated`, data);
	}

	private reportEvaluationError(name: PolicyRuleName, error: unknown): void {
		this.logger?.error('PolicyService', `Policy rule '${name}' evaluation failed`, {
			rule: name,
			error: this.describeError(error),
		});
	}

	private reportPolicyUpdateError(error: unknown): void {
		this.logger?.error('PolicyService', 'Policy update failed', {
			error: this.describeError(error),
		});
	}

	private describeDecision(decision: PolicyRuleDecisionMap[PolicyRuleName]): unknown {
		if (!decision || typeof decision !== 'object') return decision;
		if (decision instanceof Set) return [...decision];
		if ('allowed' in decision && decision.allowed instanceof Set) {
			return {
				allowed: [...decision.allowed],
				filtered: decision.filtered,
				warnings: decision.warnings,
			};
		}
		if ('matched' in decision) {
			return {
				path: decision.path,
				outcome: decision.outcome,
				matchedPath: decision.matched?.path ?? null,
				reason: decision.reason,
			};
		}
		return decision;
	}

	private isDeniedDecision(decision: PolicyRuleDecisionMap[PolicyRuleName]): boolean {
		if (!decision || typeof decision !== 'object') return false;
		if ('outcome' in decision) return decision.outcome === 'deny';
		if ('shouldUseTools' in decision) return decision.shouldUseTools === false;
		return false;
	}

	private describeError(error: unknown): unknown {
		return error instanceof Error
			? { name: error.name, message: error.message, stack: error.stack }
			: error;
	}
}

export type {
	ToolApprovalPolicyDecision,
	ToolApprovalPolicyDecisionInput,
	ToolHookPolicyDecision,
	ToolHookPolicyInput,
	ToolPolicy,
	ToolPolicyEvaluation,
	ToolPolicyEvaluationContext,
	ToolPolicyIndex,
	ToolPolicyProfile,
	ToolPolicyStageName,
	ToolPolicySubject,
	ToolRequestPolicyDecision,
	ToolRequestPolicyInput,
	ToolUsePolicyDecision,
	ToolUsePolicyInput,
};
