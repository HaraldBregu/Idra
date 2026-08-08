import { getMcpServersState, setMcpServersState } from './mcp_store_state';

export function deleteMcpServer(id: string): void {
	setMcpServersState(getMcpServersState().filter((server) => server.id !== id));
}
