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
		authorization: 'token',
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
	it('builds OpenAI MCP tools only for enabled authorized connectors', () => {
		const tools = new McpRegistry().buildTools([
			connector({ serverDescription: ' Gmail ' }),
			connector({ id: 'off', enabled: false }),
			connector({ id: 'missing', authorization: '' }),
		]);

		expect(tools).toEqual([
			expect.objectContaining({
				type: 'mcp',
				server_label: 'gmail',
				connector_id: 'connector_gmail',
				authorization: 'token',
					server_description: 'Gmail',
					allowed_tools: ['get_profile'],
					defer_loading: true,
					require_approval: 'never',
				}),
			]);
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
