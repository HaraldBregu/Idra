const getMcpServersState = jest.fn();
const setMcpServersState = jest.fn();

jest.mock('../../../../src/main/providers/providers_index', () => ({
	getMcpServersState,
	setMcpServersState,
}));

import { upsertMcpServer } from '../../../../src/main/mcp/mcp_server_upsert';

beforeEach(() => {
	jest.clearAllMocks();
	getMcpServersState.mockReturnValue([
		{
			id: 'remote',
			type: 'http',
			url: 'https://old.example/mcp',
			client_id: 'client',
			tokens: { access_token: 'secret', token_type: 'bearer' },
			codeVerifier: 'verifier',
		},
	]);
});

describe('MCP server upsert', () => {
	it('preserves OAuth state for non-identity changes', () => {
		upsertMcpServer('remote', {
			type: 'http',
			url: 'https://old.example/mcp',
			client_id: 'client',
			enabled: false,
		});

		expect(setMcpServersState).toHaveBeenCalledWith([
			expect.objectContaining({ tokens: expect.any(Object), codeVerifier: 'verifier', enabled: false }),
		]);
	});

	it('clears OAuth state when the endpoint changes', () => {
		upsertMcpServer('remote', {
			type: 'http',
			url: 'https://new.example/mcp',
			client_id: 'client',
		});

		expect(setMcpServersState).toHaveBeenCalledWith([
			{ id: 'remote', type: 'http', url: 'https://new.example/mcp', client_id: 'client' },
		]);
	});
});
