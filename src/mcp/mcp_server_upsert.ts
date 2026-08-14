import type { McpData } from '../shared/mcp_types';
import { getMcpServersState, setMcpServersState } from './mcp_store_state';
import type { McpRecord } from './mcp_types';

export function upsertMcpServer(id: string, data: McpData): void {
	const current = getMcpServersState();
	const existing = current.find((server) => server.id === id);
	const preserveAuth =
		existing?.type === 'http' &&
		data.type === 'http' &&
		existing.url === data.url &&
		(data.token === undefined || existing.token === data.token) &&
		(data.client_id === undefined || existing.client_id === data.client_id) &&
		(data.client_secret === undefined || existing.client_secret === data.client_secret);
	const next = { ...(preserveAuth ? existing : undefined), id, ...data } as McpRecord;
	setMcpServersState([...current.filter((server) => server.id !== id), next]);
}
