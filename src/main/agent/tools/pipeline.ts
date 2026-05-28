import type { AgentTool, FilteredToolDiagnostic, ToolDiagnostics } from './core/common';
import { getToolMetadata, normalizeToolName } from './core/common';
import {
	evaluateToolAccess,
	TOOL_ACCESS_STAGE_ORDER,
	type ToolAccessRule,
	type ToolAccessStageName,
	type ToolAccessSubject,
} from './access';

export type PolicyStageName = ToolAccessStageName;
export type ToolPolicy = ToolAccessRule;
export const POLICY_STAGE_ORDER = TOOL_ACCESS_STAGE_ORDER;

export type ToolPolicyPipelineContext = {
	sender?: { id?: string; isOwner?: boolean; trustedOwnerGrant?: boolean };
	trustedOwnerToolGrants?: string[];
	stages?: Partial<Record<PolicyStageName, ToolPolicy | undefined>>;
	diagnostics?: ToolDiagnostics;
	policy?: unknown;
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
	const result = evaluateToolAccess(subjects, {
		stages: context.stages,
		warnings: diagnostics?.warnings,
	});
	const current = tools.filter((tool) => result.allowed.has(normalizeToolName(tool.name)));
	const filtered = result.filtered;
	if (diagnostics) diagnostics.filteredTools.push(...filtered);
	return { tools: current, filtered, warnings: result.warnings };
}

function toolPolicySubject(tool: AgentTool): ToolAccessSubject {
	const metadata = getToolMetadata(tool);
	return {
		name: tool.name,
		ownerOnly: tool.ownerOnly,
		optional: metadata?.optional,
		ownerKind: metadata?.ownerKind,
		pluginId: metadata?.pluginId,
	};
}
