export type ConnectorConfigValue = {
	type: 'mcp';
	server_label: string;
	server_url: string;
	server_description?: string;
	authorization?: string;
	require_approval?: 'always' | 'never' | { never: { tool_names: string[] } };
	allowed_tools?: string[];
	defer_loading?: boolean;
	enabled?: boolean;
	tools?: Array<{
		name: string;
		description?: string;
		input_schema?: Record<string, unknown>;
		permission?: 'always-allow' | 'needs-approval' | 'blocked';
		requires_approval?: boolean;
	}>;
	last_refreshed_at?: string;
	created_at?: string;
	updated_at?: string;
	last_error?: string;
};

export type ConnectorRecord = Record<string, ConnectorConfigValue>;
