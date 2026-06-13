import type { Tool as ResponseTool } from 'openai/resources/responses/responses';
import type { ProviderMcpApprovalPolicy, ProviderMcpSpec } from '../types';

export function adaptOpenAIMcpTools(mcp: ProviderMcpSpec[] | undefined): ResponseTool[] {
	return (mcp ?? [])
		.filter((entry) => entry.enabled !== false)
		.map((entry) => {
			if (!entry.connectorId) {
				throw new Error(
					`MCP tool '${entry.serverLabel}' requires connectorId for OpenAI.`
				);
			}

			return {
				type: 'mcp',
				server_label: entry.serverLabel,
				connector_id: entry.connectorId,
				...(entry.authorization ? { authorization: entry.authorization } : {}),
				...(entry.headers ? { headers: entry.headers } : {}),
				...(entry.requireApproval
					? { require_approval: toOpenAIApproval(entry.requireApproval) }
					: {}),
				...(entry.allowedTools ? { allowed_tools: entry.allowedTools } : {}),
				...(entry.deferLoading !== undefined ? { defer_loading: entry.deferLoading } : {}),
				...(entry.serverDescription ? { server_description: entry.serverDescription } : {}),
			} as unknown as ResponseTool;
		});
}

function toOpenAIApproval(
	policy: ProviderMcpApprovalPolicy
): 'always' | 'never' | { never: { tool_names: string[] } } {
	if (policy === 'always' || policy === 'never') return policy;
	return { never: { tool_names: policy.never.toolNames } };
}
