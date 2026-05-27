import type { AgentTool, FilteredToolDiagnostic, ToolDiagnostics } from './core/common';
import { getToolMetadata, normalizeToolName } from './core/common';
import {
	PolicyService,
	type PolicyServicePort,
	type ToolPolicy,
	type ToolPolicyStageName,
	type ToolPolicySubject,
} from '../policy';

export type PolicyStageName = ToolPolicyStageName;

const defaultPolicyService = new PolicyService();

export const POLICY_STAGE_ORDER = defaultPolicyService.getToolPolicyStageOrder();

export type ToolPolicyPipelineContext = {
	sender?: { id?: string; isOwner?: boolean; trustedOwnerGrant?: boolean };
	trustedOwnerToolGrants?: string[];
	stages?: Partial<Record<PolicyStageName, ToolPolicy | undefined>>;
	diagnostics?: ToolDiagnostics;
	policy?: Pick<PolicyServicePort, 'evaluateTools'>;
};

export type ToolPolicyPipelineResult = {
	tools: AgentTool[];
	filtered: FilteredToolDiagnostic[];
	warnings: string[];
};

export function applyToolPolicyPipeline(
	tools: AgentTool[],
	context: ToolPolicyPipelineContext = {}
): ToolPolicyPipelineResult {
	const diagnostics = context.diagnostics;
	const subjects = tools.map(toolPolicySubject);
	const policyService = context.policy ?? defaultPolicyService;
	const result = policyService.evaluateTools(subjects, {
		sender: context.sender,
		trustedOwnerToolGrants: context.trustedOwnerToolGrants,
		stages: context.stages,
		warnings: diagnostics?.warnings,
	});
	const current = tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
	const filtered = result.filtered;
	if (diagnostics) diagnostics.filteredTools.push(...filtered);
	return { tools: current, filtered, warnings: result.warnings };
}

function toolPolicySubject(tool: AgentTool): ToolPolicySubject {
	const metadata = getToolMetadata(tool);
	return {
		name: tool.name,
		ownerOnly: tool.ownerOnly,
		optional: metadata?.optional,
		ownerKind: metadata?.ownerKind,
		pluginId: metadata?.pluginId,
	};
}
