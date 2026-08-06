const clientConnect = jest.fn();
const clientClose = jest.fn();
const buildTransport = jest.fn(() => ({}));

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
	Client: jest.fn(() => ({ connect: clientConnect, close: clientClose })),
}));
jest.mock('../../../../src/main/mcp/mcp_client_build_transport', () => ({ buildTransport }));

import { connect } from '../../../../src/main/mcp/mcp_client_connect';

beforeEach(() => {
	jest.clearAllMocks();
	clientClose.mockResolvedValue(undefined);
});

describe('MCP client connection', () => {
	it('closes a partially initialized client when connection fails', async () => {
		clientConnect.mockRejectedValue(new Error('timed out'));

		await expect(
			connect('remote', { type: 'http', url: 'https://mcp.test' }, 1_000)
		).rejects.toThrow('timed out');
		expect(clientClose).toHaveBeenCalledTimes(1);
	});
});
