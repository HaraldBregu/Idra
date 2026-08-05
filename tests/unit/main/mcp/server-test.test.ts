const connect = jest.fn();
const listTools = jest.fn();
const close = jest.fn();
const getMcpServers = jest.fn();

jest.mock('../../../../src/main/mcp/mcp_client_connect', () => ({ connect }));
jest.mock('../../../../src/main/mcp/mcp_client_list_tools', () => ({ listTools }));
jest.mock('../../../../src/main/mcp/mcp_client_close', () => ({ close }));
jest.mock('../../../../src/main/mcp/mcp_store', () => ({ getMcpServers }));

import { testMcpServer } from '../../../../src/main/mcp/mcp_server_test';

beforeEach(() => {
	jest.clearAllMocks();
	getMcpServers.mockReturnValue({ remote: { type: 'http', url: 'https://mcp.test' } });
	connect.mockResolvedValue({});
	close.mockResolvedValue(undefined);
});

describe('MCP connection test', () => {
	it('lists tools with bounded timeouts and closes the client', async () => {
		listTools.mockResolvedValue({ tools: [{ name: 'read' }, { name: 'write' }] });

		await expect(testMcpServer('remote')).resolves.toMatchObject({
			ok: true,
			tools: ['read', 'write'],
			toolCount: 2,
		});
		expect(connect).toHaveBeenCalledWith('remote', expect.any(Object), 15_000);
		expect(listTools).toHaveBeenCalledWith(expect.any(Object), 15_000);
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('returns an actionable failure and still closes the client', async () => {
		listTools.mockRejectedValue(new Error('server unavailable'));

		await expect(testMcpServer('remote')).resolves.toMatchObject({
			ok: false,
			error: 'server unavailable',
		});
		expect(close).toHaveBeenCalledTimes(1);
	});
});
