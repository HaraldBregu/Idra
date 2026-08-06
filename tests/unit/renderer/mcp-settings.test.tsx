import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import McpPage from '../../../src/renderer/src/pages/settings/pages/mcp/Page';

const mcpApi = {
	list: jest.fn(),
	get: jest.fn(),
	save: jest.fn(),
	upsert: jest.fn(),
	delete: jest.fn(),
	registry: jest.fn(),
	importLocal: jest.fn(),
	getRoot: jest.fn(),
	openRoot: jest.fn(),
	test: jest.fn(),
	oauthStart: jest.fn(),
	oauthFinish: jest.fn(),
};

let remoteEnabled = true;

beforeEach(() => {
	jest.clearAllMocks();
	remoteEnabled = true;
	Object.defineProperty(window, 'PointerEvent', { configurable: true, value: MouseEvent });
	Object.defineProperty(window, 'mcp', { configurable: true, value: mcpApi });
	mcpApi.getRoot.mockResolvedValue('/home/user/.friday/mcp/servers');
	mcpApi.registry.mockImplementation(async () => ({
		servers: [
			{
				id: 'remote',
				source: 'configured',
				data: { type: 'http', name: 'Remote docs', url: 'https://mcp.test', enabled: remoteEnabled },
			},
			{
				id: 'local',
				source: 'local',
				path: '/home/user/.friday/mcp/servers/local',
				data: { type: 'stdio', name: 'Local files', command: 'node', cwd: '/local' },
			},
		],
		diagnostics: [],
	}));
	mcpApi.test.mockImplementation(async (id: string) => ({
		ok: true,
		tools: id === 'remote' ? ['search', 'read'] : ['list'],
		toolCount: id === 'remote' ? 2 : 1,
		durationMs: 25,
	}));
	mcpApi.importLocal.mockResolvedValue({ imported: [], skipped: [] });
	mcpApi.upsert.mockImplementation(async (_id: string, data: { enabled?: boolean }) => {
		remoteEnabled = data.enabled !== false;
		return {};
	});
});

describe('MCP settings', () => {
	it('reads remote and dynamically discovered local servers', async () => {
		render(<McpPage />);

		expect(await screen.findByText('Remote docs')).toBeInTheDocument();
		expect(screen.getByText('Local files')).toBeInTheDocument();
		expect(screen.getByText('Local package')).toBeInTheDocument();
		expect(screen.getByText('/home/user/.friday/mcp/servers/local')).toBeInTheDocument();
	});

	it('tests each server independently and reports discovered tools', async () => {
		const user = userEvent.setup();
		render(<McpPage />);
		const buttons = await screen.findAllByRole('button', { name: /^Test / });

		await user.click(buttons[0]);
		await waitFor(() => expect(mcpApi.test).toHaveBeenCalledWith('remote'));
		expect(await screen.findByText('2 tools · 25 ms')).toBeInTheDocument();
	});

	it('uploads local packages and refreshes the registry', async () => {
		const user = userEvent.setup();
		render(<McpPage />);
		await screen.findByText('Local files');

		await user.click(screen.getByRole('button', { name: 'Upload local' }));
		await waitFor(() => expect(mcpApi.importLocal).toHaveBeenCalledTimes(1));
		expect(mcpApi.registry).toHaveBeenCalledTimes(2);
		expect(await screen.findByText('Uploaded 0 local MCP servers.')).toBeInTheDocument();
	});

	it('invalidates a successful test when the server is disabled', async () => {
		const user = userEvent.setup();
		render(<McpPage />);
		await user.click(await screen.findByRole('button', { name: 'Test Remote docs' }));
		expect(await screen.findByText('Connected')).toBeInTheDocument();

		await user.click(screen.getByRole('switch', { name: 'Disable Remote docs' }));
		expect(await screen.findByText('Disabled')).toBeInTheDocument();
		expect(screen.queryByText('Connected')).not.toBeInTheDocument();
	});

	it('shows toggle failures without an unhandled rejection', async () => {
		const user = userEvent.setup();
		mcpApi.upsert.mockRejectedValueOnce(new Error('Unable to save server'));
		render(<McpPage />);
		await screen.findByText('Remote docs');

		await user.click(screen.getByRole('switch', { name: 'Disable Remote docs' }));
		expect(await screen.findAllByText('Unable to save server')).not.toHaveLength(0);
	});
});
