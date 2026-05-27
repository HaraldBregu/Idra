import { McpRegistry } from '../../../../src/main/agent/mcp/McpRegistry';
import { createSafeMcpEnv } from '../../../../src/main/agent/mcp/env';
import { McpPermissionError, McpTimeoutError, normalizeMcpError } from '../../../../src/main/agent/mcp/errors';
import { withRetry, withTimeout } from '../../../../src/main/agent/mcp/timeout';
import type { ConnectorConfig } from '../../../../src/shared/connectors';

function connector(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
	return {
		id: 'c1',
		name: 'Gmail',
		connectorId: 'connector_gmail',
		serverLabel: 'gmail',
		enabled: true,
		authorization: '',
		mcp: { transport: 'http', url: 'https://mcp.example.test/mcp', auth: { env: 'REMOTE_MCP_API_KEY' } },
		requireApproval: 'never_for_allowed_tools',
		allowedTools: ['get_profile'],
		deferLoading: true,
		tools: [],
		createdAt: '',
		updatedAt: '',
		...overrides,
	};
}

describe('mcp modules', () => {
	it('builds harness MCP server configs from enabled connectors with env secrets', () => {
		process.env.REMOTE_MCP_API_KEY = 'secret';
		const servers = new McpRegistry().buildServers([
			connector(),
			connector({ id: 'off', enabled: false }),
			connector({ id: 'missing', mcp: { transport: 'http', url: 'https://mcp.example.test/mcp', auth: { env: 'MISSING_MCP_KEY' } } }),
		]);

		expect(servers).toEqual([
			expect.objectContaining({
				name: 'gmail',
				transport: 'http',
				url: 'https://mcp.example.test/mcp',
				headers: { Authorization: 'Bearer secret' },
				toolPrefix: 'gmail',
			}),
		]);
		delete process.env.REMOTE_MCP_API_KEY;
	});

	it('creates safe environment maps and normalizes errors', () => {
		process.env.PATH = '/bin';
		const env = createSafeMcpEnv({ SECRET_TOKEN: 'x', ' CUSTOM ': 'y' });
		expect(env.PATH).toBe('/bin');
		expect(env.SECRET_TOKEN).toBe('x');
		expect(env.CUSTOM).toBe('y');
		expect(normalizeMcpError(new Error('access denied'), 'fallback')).toBeInstanceOf(McpPermissionError);
		expect(normalizeMcpError(new Error('timed out'), 'fallback')).toBeInstanceOf(McpTimeoutError);
		expect(normalizeMcpError(null, 'fallback').message).toBe('fallback');
	});

	it('applies timeouts and retries', async () => {
		await expect(
			withTimeout(
				'slow',
				1,
				(signal) =>
					new Promise((_resolve, reject) => {
						signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
					})
			)
		).rejects.toThrow(McpTimeoutError);
		const run = jest.fn()
			.mockRejectedValueOnce(new Error('first'))
			.mockResolvedValueOnce('ok');
		await expect(withRetry(1, run)).resolves.toBe('ok');
		expect(run).toHaveBeenCalledTimes(2);
	});
});
