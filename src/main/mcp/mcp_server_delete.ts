import { getMcpServersState, setMcpServersState } from '../providers/providers_index';

export function deleteMcpServer(id: string): void {
	setMcpServersState(getMcpServersState().filter((server) => server.id !== id));
}
