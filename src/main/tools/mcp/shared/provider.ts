import type { ConnectorsService } from '../../../connectors';
import type { ProviderBuiltInToolSpec } from '../../../llm/types';

type StoredConnector = ReturnType<ConnectorsService['listStored']>[number];

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
		labels.add(connector.serverLabel);
		tools.push({
			type: 'mcp',
			server_label: connector.serverLabel,
			server_url: serverUrl,
			require_approval: approvalPolicy(connector),
			...(connector.serverDescription ? { server_description: connector.serverDescription } : {}),
			...(authorization ? { authorization } : {}),
			...(connector.allowedTools.length > 0 ? { allowed_tools: [...connector.allowedTools] } : {}),
			...(connector.deferLoading ? { defer_loading: true } : {}),
		});
	}
	return tools;
}

function approvalPolicy(connector: StoredConnector): ProviderBuiltInToolSpec['require_approval'] {
	if (connector.requireApproval === 'never') return 'never';
	if (connector.requireApproval === 'never_for_allowed_tools' && connector.allowedTools.length > 0) {
		return { never: { tool_names: [...connector.allowedTools] } };
	}
	return 'always';
}

function connectorAuthorization(connector: StoredConnector): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}
