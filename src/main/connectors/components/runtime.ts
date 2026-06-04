import type { AgentTool, ToolContext } from '../../tools/shared/types';
import { textResult } from '../../tools/shared/types';
import type {
	ConnectorApprovalMode,
	ConnectorConfig,
	ConnectorStatus,
	ConnectorTool,
	ConnectorView,
} from '../../../shared/connector';

export function cloneValue<T>(value: T): T {
	if (value === undefined || value === null) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function isOpenAiResponsesConnector(connector: Pick<ConnectorConfig, 'mcp' | 'serverUrl'>): boolean {
	return !connector.mcp || Boolean(connector.serverUrl);
}

export function isOpenAiConnectorIdTool(connector: Pick<ConnectorConfig, 'mcp' | 'serverUrl'>): boolean {
	return isOpenAiResponsesConnector(connector) && !connector.serverUrl;
}

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

export function requiredMcpSecretNames(connector: ConnectorConfig): string[] {
	const mcp = connector.mcp;
	if (!mcp) return [];
	if (mcp.transport === 'http') return mcp.auth?.env ? [mcp.auth.env] : [];
	if (mcp.transport === 'stdio') return (mcp.envSecrets ?? []).map((secret) => secret.env);
	return [];
}

export function hasMissingMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): boolean {
	return requiredMcpSecretNames(connector).some((name) => !env[name]);
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

export function connectorAuthorization(connector: ConnectorConfig): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}

export function redactConnectorSecrets(connector: ConnectorConfig): ConnectorConfig {
	if (!connector.oauth) return { ...connector, authorization: '' };
	const token = connector.oauth.token;
	return {
		...connector,
		authorization: '',
		oauth: {
			...connector.oauth,
			accessToken: connector.oauth.accessToken ? '' : undefined,
			refreshToken: connector.oauth.refreshToken ? '' : undefined,
			clientSecret: connector.oauth.clientSecret ? '' : undefined,
			token: token
				? {
						...token,
						accessToken: '',
						refreshToken: token.refreshToken ? '' : undefined,
					}
				: undefined,
		},
	};
}

export function toConnectorView(connector: ConnectorConfig, env: NodeJS.ProcessEnv): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: authKindFor(connector),
		serverLabel: connector.serverLabel,
		serverUrl: connector.serverUrl,
		enabled: connector.enabled,
		status: toConnectorStatus(connector, env),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
		connectedAccount: connector.oauth?.accountEmail ?? connector.oauth?.email,
	};
}

export function toConnectorStatus(connector: ConnectorConfig, env: NodeJS.ProcessEnv): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (isOpenAiConnectorIdTool(connector) && !connectorAuthorization(connector)) return 'missing_auth';
	if (hasMissingMcpSecrets(connector, env)) return 'missing_auth';
	if (connector.oauth && !connector.oauth.token?.accessToken && !connector.oauth.token?.refreshToken) {
		return 'missing_auth';
	}
	return 'configured';
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

function authKindFor(connector: ConnectorConfig): ConnectorView['authKind'] {
	if (connector.oauth) return 'oauth';
	if (isOpenAiResponsesConnector(connector)) {
		return connector.serverUrl && !connectorAuthorization(connector) ? 'none' : 'manual_oauth_access_token';
	}
	return 'mcp_env';
}

function agentToolNameFor(connector: ConnectorConfig, toolName: string): string {
	return `${connector.serverLabel}_${toolName}`
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
}
