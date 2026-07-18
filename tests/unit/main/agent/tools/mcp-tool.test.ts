import { mcpTool } from '../../../../../src/main/agent/tools/mcp_tool';
import type { McpClient } from '../../../../../src/main/agent/mcp';

const client = {} as McpClient;

describe('mcpTool', () => {
	it('maps server approval settings to a fail-safe tool fallback', () => {
		expect(mcpTool(client, 'lookup', '', {}, 'safe', 'never').defaultPermission).toBe('allow');
		expect(mcpTool(client, 'delete', '', {}, 'safe', 'always').defaultPermission).toBe('ask');
		expect(mcpTool(client, 'unknown', '', {}, 'safe').defaultPermission).toBe('ask');
	});
});
