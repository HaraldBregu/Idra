export type ConnectorRecord = Record<string, {
	type: 'mcp';
	server_label: string;
	server_url: string;
	server_description?: string;
	authorization?: string;
	require_approval?: 'always' | 'never';
	defer_loading?: boolean;
	enabled?: boolean;
	last_refreshed_at?: string;
	created_at?: string;
	updated_at?: string;
	last_error?: string;
}>;
