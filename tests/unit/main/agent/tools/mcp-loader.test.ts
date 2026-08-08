const connectMock = jest.fn();
const listToolsMock = jest.fn();
const closeMock = jest.fn();
const getMcpServersMock = jest.fn();

jest.mock('../../../../../src/main/mcp', () => ({
	connect: (...args: unknown[]) => connectMock(...args),
	listTools: (...args: unknown[]) => listToolsMock(...args),
	close: (...args: unknown[]) => closeMock(...args),
	getMcpServers: () => getMcpServersMock(),
}));

import { loadMcpTools } from '../../../../../src/main/agent/tools/mcp/loader';
import {
	MCP_MAX_SCHEMA_BYTES,
	MCP_MAX_TOOLS,
} from '../../../../../src/main/agent/tools/mcp/limits';

describe('loadMcpTools', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		connectMock.mockResolvedValue({});
		closeMock.mockResolvedValue(undefined);
		getMcpServersMock.mockReturnValue({ safe: { type: 'http', url: 'https://mcp.test' } });
	});

	it('rejects invalid and oversized schemas and caps the total tool count', async () => {
		listToolsMock.mockResolvedValue({
			tools: [
				{ name: 'invalid', inputSchema: { type: 'invalid' } },
				{
					name: 'oversized',
					inputSchema: { type: 'object', description: 'x'.repeat(MCP_MAX_SCHEMA_BYTES) },
				},
				...Array.from({ length: MCP_MAX_TOOLS + 10 }, (_, index) => ({
					name: `tool-${index}`,
					inputSchema: { type: 'object', properties: {} },
				})),
			],
		});

		const result = await loadMcpTools();
		expect(result.tools).toHaveLength(MCP_MAX_TOOLS);
		expect(result.tools.map((tool) => tool.name)).not.toEqual(
			expect.arrayContaining(['mcp__safe__invalid', 'mcp__safe__oversized'])
		);
		await result.close();
		expect(closeMock).toHaveBeenCalledTimes(1);
	});

	it('normalizes provider names and resolves collisions deterministically', async () => {
		listToolsMock.mockResolvedValue({
			tools: [
				{ name: 'do thing', inputSchema: { type: 'object' } },
				{ name: 'do@thing', inputSchema: { type: 'object' } },
				{ name: 'x'.repeat(100), inputSchema: { type: 'object' } },
			],
		});

		const result = await loadMcpTools();
		const names = result.tools.map((tool) => tool.name);
		expect(new Set(names)).toHaveProperty('size', names.length);
		expect(names[0]).toBe('mcp__safe__do_thing');
		for (const name of names) {
			expect(name).toMatch(/^[a-zA-Z0-9_-]+$/);
			expect(name.length).toBeLessThanOrEqual(64);
		}
	});
});
