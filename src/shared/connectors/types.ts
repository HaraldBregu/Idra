export type ConnectorConfigValue = {
	type: 'mcp';
	server_label: string;
	server_url: string;
	authorization?: string;
	require_approval?: 'never';
	allowed_tools?: string[];
};

export type ConnectorRecord = Record<string, ConnectorConfigValue>;
