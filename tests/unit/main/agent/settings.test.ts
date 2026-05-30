jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
		};
	});
});

import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import {
	AgentDataDirectoryService,
	AgentSettingsStore,
	resolveDefaultAgentDataPath,
} from '../../../../src/main/agent';

const MockStore = Store as jest.MockedClass<typeof Store>;

function createMemoryStore() {
	const data = new Map<string, unknown>();
	return {
		data,
		get: jest.fn((key: string) => data.get(key)),
		set: jest.fn((key: string, value: unknown) => {
			data.set(key, value);
		}),
	};
}

describe('agent app-data storage', () => {
	beforeEach(() => {
		MockStore.mockClear();
		(app.getPath as jest.Mock).mockImplementation((name: string) => `/tmp/friday-test/${name}`);
	});

	it('resolves agent data under Electron appData instead of the home user-data directory', () => {
		const directory = new AgentDataDirectoryService();

		expect(directory.getRootPath()).toBe(path.join('/tmp/friday-test/appData', 'friday', 'agent'));
		expect(resolveDefaultAgentDataPath('sessions')).toBe(
			path.join('/tmp/friday-test/appData', 'friday', 'agent', 'sessions')
		);
		expect(() => directory.resolve('..')).toThrow(/cannot traverse/);
	});

	it('creates electron-store agent.json in the agent app-data directory', () => {
		new AgentSettingsStore();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'agent',
			cwd: path.join('/tmp/friday-test/appData', 'friday', 'agent'),
			accessPropertiesByDotNotation: false,
		});
	});

	it('normalizes top-level agent settings in agent.json', () => {
		const store = createMemoryStore();
		const service = new AgentSettingsStore({ store });

		const settings = service.setAgentRoutingSettings({
			agents: [
				{
					id: ' main ',
					default: true,
					model: { providerId: ' OpenAI ', modelId: ' gpt-5.4 ', effort: 'high' },
				},
			],
			bindings: [
				{
					agentId: ' main ',
					match: { channel: ' Slack ', peer: { kind: 'Direct', id: ' U123 ' } },
					session: { scope: 'per-peer' },
				},
			],
		});

		expect(settings).toEqual({
			agents: [
				{
					id: 'main',
					default: true,
					model: { providerId: 'openai', modelId: 'gpt-5.4', effort: 'high' },
				},
			],
			bindings: [
				{
					agentId: 'main',
					match: { channel: 'slack', peer: { kind: 'direct', id: 'U123' } },
					session: { scope: 'per-peer' },
				},
			],
		});
		expect(store.data.get('agents')).toEqual(settings.agents);
		expect(store.data.get('bindings')).toEqual(settings.bindings);
		expect(service.getAgentConfig('main')).toEqual(settings.agents[0]);
	});
});
