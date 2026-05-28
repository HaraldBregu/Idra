import { ipcRenderer } from 'electron';
import { connectors } from '../../../../src/preload';
import { OPENAI_CONNECTOR_CATALOG } from '../../../../src/shared/connector';
import type {
	ConnectorConfig,
	ConnectorOAuthConnectResult,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorView,
} from '../../../../src/shared/connector';
import { ConnectorsChannels } from '../../../../src/shared/ipc-channels';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

const connectorConfig: ConnectorConfig = {
	id: 'connector-record-1',
	name: 'My Gmail',
	connectorId: 'connector_gmail',
	serverLabel: 'my_gmail',
	enabled: true,
	authorization: '',
	requireApproval: 'always',
	allowedTools: ['get_profile'],
	deferLoading: false,
	tools: [],
	createdAt: '2026-05-24T00:00:00.000Z',
	updatedAt: '2026-05-24T00:00:00.000Z',
};

const connectorView: ConnectorView = {
	id: connectorConfig.id,
	name: connectorConfig.name,
	connectorId: connectorConfig.connectorId,
	authKind: 'google_oauth',
	serverLabel: connectorConfig.serverLabel,
	enabled: true,
	status: 'configured',
	requireApproval: 'always',
	allowedToolsCount: 1,
	toolsCount: 1,
	deferLoading: false,
};

const connectorTool: ConnectorTool = {
	name: 'get_profile',
	description: 'Get profile.',
	inputSchema: { type: 'object' },
	requiresApproval: false,
};

const testResult: ConnectorTestResult = {
	status: 'configured',
	message: 'Connected.',
};

const oauthResult: ConnectorOAuthConnectResult = {
	status: 'configured',
	message: 'Connected Google account user@example.com.',
	connectedAccount: 'user@example.com',
};

describe('connectors preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
	});

	it('invokes every connector API method through the typed IPC channels', async () => {
		const addInput = {
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			allowedTools: ['get_profile'],
		};
		const updateInput = { enabled: false };
		const callOptions = { timeoutMs: 1000 };

		const cases = [
			{
				run: () => connectors.catalog(),
				channel: ConnectorsChannels.catalog,
				args: [],
				data: OPENAI_CONNECTOR_CATALOG,
			},
			{
				run: () => connectors.list(),
				channel: ConnectorsChannels.list,
				args: [],
				data: [connectorView],
			},
			{
				run: () => connectors.get(connectorConfig.id),
				channel: ConnectorsChannels.get,
				args: [connectorConfig.id],
				data: connectorConfig,
			},
			{
				run: () => connectors.add(addInput),
				channel: ConnectorsChannels.add,
				args: [addInput],
				data: connectorConfig,
			},
			{
				run: () => connectors.update(connectorConfig.id, updateInput),
				channel: ConnectorsChannels.update,
				args: [connectorConfig.id, updateInput],
				data: connectorConfig,
			},
			{
				run: () => connectors.remove(connectorConfig.id),
				channel: ConnectorsChannels.remove,
				args: [connectorConfig.id],
				data: undefined,
			},
			{
				run: () => connectors.enable(connectorConfig.id),
				channel: ConnectorsChannels.enable,
				args: [connectorConfig.id],
				data: connectorConfig,
			},
			{
				run: () => connectors.disable(connectorConfig.id),
				channel: ConnectorsChannels.disable,
				args: [connectorConfig.id],
				data: connectorConfig,
			},
			{
				run: () => connectors.test(connectorConfig.id),
				channel: ConnectorsChannels.test,
				args: [connectorConfig.id],
				data: testResult,
			},
			{
				run: () => connectors.reconnect(connectorConfig.id),
				channel: ConnectorsChannels.reconnect,
				args: [connectorConfig.id],
				data: testResult,
			},
			{
				run: () => connectors.refreshTools(connectorConfig.id),
				channel: ConnectorsChannels.refreshTools,
				args: [connectorConfig.id],
				data: [connectorTool],
			},
			{
				run: () => connectors.listTools(connectorConfig.id),
				channel: ConnectorsChannels.listTools,
				args: [connectorConfig.id],
				data: [connectorTool],
			},
			{
				run: () =>
					connectors.callTool(connectorConfig.id, 'get_profile', { verbose: true }, callOptions),
				channel: ConnectorsChannels.callTool,
				args: [connectorConfig.id, 'get_profile', { verbose: true }, callOptions],
				data: { emailAddress: 'user@example.com' },
			},
			{
				run: () => connectors.connectOAuth(connectorConfig.id),
				channel: ConnectorsChannels.connectOAuth,
				args: [connectorConfig.id],
				data: oauthResult,
			},
		] as const;

		for (const item of cases) {
			mockedIpcRenderer.invoke.mockResolvedValueOnce({ success: true, data: item.data });

			await expect(item.run()).resolves.toEqual(item.data);
			expect(mockedIpcRenderer.invoke).toHaveBeenLastCalledWith(item.channel, ...item.args);
		}
	});

	it('unwraps connector IPC errors from the preload boundary', async () => {
		mockedIpcRenderer.invoke.mockResolvedValueOnce({
			success: false,
			error: { message: 'Connector failed' },
		});

		await expect(connectors.list()).rejects.toThrow('Connector failed');
	});
});
