import type { AgentTool, ToolContext } from '../tools/shared/types';
import { textResult } from '../tools/shared/types';
import type { ConnectorApprovalMode, ConnectorConfig, ConnectorTool } from '../../shared/connector';
import { errorMessage, requiredMcpSecretNames } from '../connectors/components/runtime';

export function normalizeTool(tool: ConnectorTool): ConnectorTool {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		permission: tool.permission ?? 'always-allow',
		requiresApproval: tool.requiresApproval ?? false,
	};
}

export function applyToolPolicy(
	tools: readonly ConnectorTool[],
	allowedTools: readonly string[],
	requireApproval: ConnectorApprovalMode
): ConnectorTool[] {
	const allowed = new Set(allowedTools);
	return tools.map((tool) => {
		const blocked = allowed.size > 0 && !allowed.has(tool.name);
		if (blocked) return { ...normalizeTool(tool), permission: 'blocked', requiresApproval: false };
		if (allowed.size === 0 || requireApproval === 'never' || requireApproval === 'never_for_allowed_tools') {
			return { ...normalizeTool(tool), permission: 'always-allow', requiresApproval: false };
		}
		return { ...normalizeTool(tool), permission: 'needs-approval', requiresApproval: true };
	});
}

export function assertMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): void {
	const missing = requiredMcpSecretNames(connector).filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(`Missing required MCP secret environment variables: ${missing.join(', ')}`);
	}
}

export function resolveMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): Record<string, string> {
	const secrets: Record<string, string> = {};
	for (const name of requiredMcpSecretNames(connector)) {
		const value = env[name];
		if (value) secrets[name] = value;
	}
	return secrets;
}

export function toAgentTool(
	connector: ConnectorConfig,
	tool: ConnectorTool,
	callTool: (connectorId: string, toolName: string, args: Record<string, unknown>) => Promise<unknown>
): AgentTool {
	return {
		name: agentToolNameFor(connector, tool.name),
		description: `${connector.name}: ${tool.description ?? tool.name}`,
		schema: (tool.inputSchema ?? { type: 'object' }) as AgentTool['schema'],
		needsApproval: (_args: unknown, _ctx: ToolContext) => tool.requiresApproval,
		execute: async (args: Record<string, unknown>) => {
			try {
				const payload = await callTool(connector.id, tool.name, args);
				return textResult(JSON.stringify(payload, null, 2));
			} catch (error) {
				return textResult(errorMessage(error), true);
			}
		},
	};
}

function agentToolNameFor(connector: ConnectorConfig, toolName: string): string {
	return `${connector.serverLabel}_${toolName}`
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
}
