import type { McpData } from '../../shared/mcp_types';
import { getMcpServersState, setMcpServersState } from '../providers/providers_index';
import type { McpRecord } from './mcp_types';

export function upsertMcpServer(id: string, data: McpData): void {
	const current = getMcpServersState();
	const existing = current.find((server) => server.id === id);
	const next = { ...existing, id, ...data } as McpRecord;
	setMcpServersState([...current.filter((server) => server.id !== id), next]);
}
