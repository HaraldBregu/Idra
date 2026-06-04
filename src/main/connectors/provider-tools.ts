import type { ProviderBuiltInToolSpec } from '../llm/types';
import type { ConnectorsService } from './service';

type StoredConnector = ReturnType<ConnectorsService['listStored']>[number];

const GMAIL_READ_TOOLS = [
	'get_profile',
	'search_threads',
	'read_thread',
	'get_thread',
	'search_emails',
	'search_email_ids',
	'get_recent_emails',
	'read_email',
	'batch_read_email',
];

export function createRemoteMcpProviderTools(
	connectors: Pick<ConnectorsService, 'listStored'> | undefined
): ProviderBuiltInToolSpec[] {
	if (!connectors) return [];
	const labels = new Set<string>();
	const tools: ProviderBuiltInToolSpec[] = [];
	for (const connector of connectors.listStored()) {
		const serverUrl = connector.serverUrl?.trim();
		if (!connector.enabled || !serverUrl || labels.has(connector.serverLabel)) continue;
		const authorization = connectorAuthorization(connector);
		if (connector.oauth && !authorization) continue;
		const allowedTools = effectiveAllowedTools(connector);
		labels.add(connector.serverLabel);
		tools.push({
			type: 'mcp',
			server_label: connector.serverLabel,
			server_url: serverUrl,
			require_approval: approvalPolicy(connector, allowedTools),
			...(connector.serverDescription ? { server_description: connector.serverDescription } : {}),
			...(authorization ? { authorization } : {}),
			...(allowedTools.length > 0 ? { allowed_tools: allowedTools } : {}),
			...(connector.deferLoading ? { defer_loading: true } : {}),
		});
	}
	return tools;
}

function approvalPolicy(
	connector: StoredConnector,
	allowedTools: string[]
): ProviderBuiltInToolSpec['require_approval'] {
	if (connector.requireApproval === 'never') return 'never';
	if (
		(connector.requireApproval === 'never_for_allowed_tools' || isGmailRemoteMcp(connector)) &&
		allowedTools.length > 0
	) {
		return { never: { tool_names: [...allowedTools] } };
	}
	return 'always';
}

function effectiveAllowedTools(connector: StoredConnector): string[] {
	if (connector.allowedTools.length > 0) return [...connector.allowedTools];
	return isGmailRemoteMcp(connector) ? [...GMAIL_READ_TOOLS] : [];
}

function isGmailRemoteMcp(connector: StoredConnector): boolean {
	return connector.serverLabel === 'gmail' || connector.serverUrl === 'https://gmailmcp.googleapis.com/mcp/v1';
}

function connectorAuthorization(connector: StoredConnector): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}
