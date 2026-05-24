import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { ConnectorsIpc } from '../../../../src/main/ipc/connectors-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { OPENAI_CONNECTOR_CATALOG } from '../../../../src/shared/connector';
import type {
	ConnectorConfig,
	ConnectorOAuthConnectResult,
	ConnectorTestResult,
	ConnectorTool,
	ConnectorView,
} from '../../../../src/shared/connector';
import { ConnectorsChannels } from '../../../../src/shared/ipc-channels';

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

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

function createConnectorsService() {
	return {
		catalog: jest.fn(() => OPENAI_CONNECTOR_CATALOG),
		list: jest.fn(() => [connectorView]),
		get: jest.fn(() => connectorConfig),
		add: jest.fn(() => connectorConfig),
		update: jest.fn(() => connectorConfig),
		remove: jest.fn(async () => undefined),
		enable: jest.fn(() => connectorConfig),
		disable: jest.fn(() => connectorConfig),
		test: jest.fn(() => testResult),
		reconnect: jest.fn(() => testResult),
		refreshTools: jest.fn(() => [connectorTool]),
		listTools: jest.fn(() => [connectorTool]),
		callTool: jest.fn(() => ({ emailAddress: 'user@example.com' })),
		connectOAuth: jest.fn(() => oauthResult),
	};
}

function createContainer(connectors: ReturnType<typeof createConnectorsService>): MainServiceContainer {
	const services = {
		connectors,
		logger: { info: jest.fn() },
	};
	return {
		get: jest.fn((key: keyof typeof services) => services[key]),
	} as unknown as MainServiceContainer;
}

describe('ConnectorsIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('forwards every connector IPC channel to the connectors service', async () => {
		const connectors = createConnectorsService();
		new ConnectorsIpc().register(createContainer(connectors), new EventBus());

		const addInput = {
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			allowedTools: ['get_profile'],
		};
		const updateInput = { enabled: false };
		const callOptions = { timeoutMs: 1000 };

		const cases = [
			{
				channel: ConnectorsChannels.catalog,
				args: [],
				method: connectors.catalog,
				expectedArgs: [],
				expectedData: OPENAI_CONNECTOR_CATALOG,
			},
			{
				channel: ConnectorsChannels.list,
				args: [],
				method: connectors.list,
				expectedArgs: [],
				expectedData: [connectorView],
			},
			{
				channel: ConnectorsChannels.get,
				args: [connectorConfig.id],
				method: connectors.get,
				expectedArgs: [connectorConfig.id],
				expectedData: connectorConfig,
			},
			{
				channel: ConnectorsChannels.add,
				args: [addInput],
				method: connectors.add,
				expectedArgs: [addInput],
				expectedData: connectorConfig,
			},
			{
				channel: ConnectorsChannels.update,
				args: [connectorConfig.id, updateInput],
				method: connectors.update,
				expectedArgs: [connectorConfig.id, updateInput],
				expectedData: connectorConfig,
			},
			{
				channel: ConnectorsChannels.remove,
				args: [connectorConfig.id],
				method: connectors.remove,
				expectedArgs: [connectorConfig.id],
				expectedData: undefined,
			},
			{
				channel: ConnectorsChannels.enable,
				args: [connectorConfig.id],
				method: connectors.enable,
				expectedArgs: [connectorConfig.id],
				expectedData: connectorConfig,
			},
			{
				channel: ConnectorsChannels.disable,
				args: [connectorConfig.id],
				method: connectors.disable,
				expectedArgs: [connectorConfig.id],
				expectedData: connectorConfig,
			},
			{
				channel: ConnectorsChannels.test,
				args: [connectorConfig.id],
				method: connectors.test,
				expectedArgs: [connectorConfig.id],
				expectedData: testResult,
			},
			{
				channel: ConnectorsChannels.reconnect,
				args: [connectorConfig.id],
				method: connectors.reconnect,
				expectedArgs: [connectorConfig.id],
				expectedData: testResult,
			},
			{
				channel: ConnectorsChannels.refreshTools,
				args: [connectorConfig.id],
				method: connectors.refreshTools,
				expectedArgs: [connectorConfig.id],
				expectedData: [connectorTool],
			},
			{
				channel: ConnectorsChannels.listTools,
				args: [connectorConfig.id],
				method: connectors.listTools,
				expectedArgs: [connectorConfig.id],
				expectedData: [connectorTool],
			},
			{
				channel: ConnectorsChannels.callTool,
				args: [connectorConfig.id, 'get_profile', { verbose: true }, callOptions],
				method: connectors.callTool,
				expectedArgs: [connectorConfig.id, 'get_profile', { verbose: true }, callOptions],
				expectedData: { emailAddress: 'user@example.com' },
			},
			{
				channel: ConnectorsChannels.connectOAuth,
				args: [connectorConfig.id],
				method: connectors.connectOAuth,
				expectedArgs: [connectorConfig.id],
				expectedData: oauthResult,
			},
		] as const;

		for (const item of cases) {
			await expect(registeredHandler(item.channel)({}, ...item.args)).resolves.toEqual({
				success: true,
				data: item.expectedData,
			});
			expect(item.method).toHaveBeenCalledWith(...item.expectedArgs);
		}
	});
});
