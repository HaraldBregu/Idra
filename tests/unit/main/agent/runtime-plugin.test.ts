import { makeLogger } from '../test-helpers';
import type { ConnectorManifestRecord } from '../../../../src/main/plugins';
import type {
	ConnectorActivationPlan,
	ConnectorActivationTrigger,
} from '../../../../src/main/plugins/activation-planner';

const discoverConnectorManifestsMock = jest.fn();
const resolveConnectorActivationPlanMock = jest.fn();
const loadConnectorEntryMock = jest.fn();

jest.mock('../../../../src/main/plugins/discovery', () => ({
	discoverConnectorManifests: (...args: Parameters<typeof discoverConnectorManifestsMock>) =>
		discoverConnectorManifestsMock(...args),
}));

jest.mock('../../../../src/main/plugins/activation-planner', () => ({
	resolveConnectorActivationPlan: (...args: Parameters<typeof resolveConnectorActivationPlanMock>) =>
		resolveConnectorActivationPlanMock(...args),
}));

jest.mock('../../../../src/main/plugins/loader', () => ({
	loadConnectorEntry: (...args: Parameters<typeof loadConnectorEntryMock>) => loadConnectorEntryMock(...args),
}));

function clearHarnessActivationState(): void {
	delete (globalThis as { [key: string]: unknown })[Symbol.for('friday.agentHarnessRuntimeActivationState')];
}

function mockDiscoveryResult(records: ConnectorManifestRecord[]) {
	discoverConnectorManifestsMock.mockReturnValue({
		records,
		diagnostics: [],
	});
}

function mockPlanResult(runtime: string, pluginIds: string[]): void {
	const plan: ConnectorActivationPlan = {
		trigger: { kind: 'agentHarness', runtime } as ConnectorActivationTrigger,
		pluginIds,
		entries: [],
		diagnostics: [],
	};
	resolveConnectorActivationPlanMock.mockReturnValue(plan);
}

function record(id: string): ConnectorManifestRecord {
	return {
		id,
		manifest: {
			id,
			name: id,
			description: id,
			contracts: {},
		},
		manifestPath: `/tmp/${id}/friday.plugin.json`,
		rootDir: `/tmp/${id}`,
		origin: 'bundled',
		source: `/tmp/${id}/index.ts`,
	};
}

describe('agent/harness/runtime-plugin', () => {
	beforeEach(() => {
		jest.resetModules();
		clearHarnessActivationState();
		discoverConnectorManifestsMock.mockReset();
		resolveConnectorActivationPlanMock.mockReset();
		loadConnectorEntryMock.mockReset();
	});

	it('filters activation manifests to the IDs returned by the activation plan', async () => {
		mockDiscoveryResult([record('alpha'), record('beta'), record('gamma')]);
		mockPlanResult('codex', ['beta']);
		loadConnectorEntryMock.mockResolvedValue({ ok: true, diagnostics: [] });

		const { registerAgentHarnessRuntimePluginActivation } = await import(
			'../../../../src/main/agent/harness/runtime-plugin'
		);
		const { listActivationPlanManifestsForRuntime } = await import(
			'../../../../src/main/agent/harness/activation'
		);

		registerAgentHarnessRuntimePluginActivation(makeLogger());

		const manifests = await listActivationPlanManifestsForRuntime('codex');

		expect(manifests).toEqual([record('beta')]);
		expect(mockDiscoveryResult).toHaveBeenCalledTimes(0);
	});

	it('throws when activation has no matching runtime candidates', async () => {
		mockDiscoveryResult([record('solo')]);
		mockPlanResult('missing-runtime', []);
		loadConnectorEntryMock.mockResolvedValue({ ok: true, diagnostics: [] });

		const { registerAgentHarnessRuntimePluginActivation } = await import(
			'../../../../src/main/agent/harness/runtime-plugin'
		);
		const { ensureAgentHarnessRuntimeActivated } = await import('../../../../src/main/agent/harness/activation');

		registerAgentHarnessRuntimePluginActivation(makeLogger());

		await expect(
			ensureAgentHarnessRuntimeActivated({ runtime: 'missing-runtime', provider: 'openai', modelId: 'gpt-test' })
		).rejects.toThrow('No agent harness runtime plugin candidates found for missing-runtime');
		expect(loadConnectorEntryMock).not.toHaveBeenCalled();
	});

	it('loads each harness plugin entry only once per runtime', async () => {
		mockDiscoveryResult([record('repeatable')]);
		mockPlanResult('reuse', ['repeatable']);
		loadConnectorEntryMock.mockResolvedValue({ ok: true, diagnostics: [] });

		const { registerAgentHarnessRuntimePluginActivation } = await import(
			'../../../../src/main/agent/harness/runtime-plugin'
		);
		const { ensureAgentHarnessRuntimeActivated } = await import('../../../../src/main/agent/harness/activation');

		registerAgentHarnessRuntimePluginActivation(makeLogger());

		await expect(
			ensureAgentHarnessRuntimeActivated({ runtime: 'reuse', provider: 'openai', modelId: 'gpt-test' })
		).resolves.toBeUndefined();
		await expect(
			ensureAgentHarnessRuntimeActivated({ runtime: 'reuse', provider: 'openai', modelId: 'gpt-test' })
		).resolves.toBeUndefined();

		expect(loadConnectorEntryMock).toHaveBeenCalledTimes(1);
	});

	it('throws when candidate runtime entry cannot be loaded', async () => {
		mockDiscoveryResult([record('broken')]);
		mockPlanResult('broken-runtime', ['broken']);
		loadConnectorEntryMock.mockResolvedValue({
			ok: false,
			diagnostics: [{ level: 'error', message: 'entry crashed', code: 'runtime_entry_import_failed', pluginId: 'broken' }],
		});

		const { registerAgentHarnessRuntimePluginActivation } = await import(
			'../../../../src/main/agent/harness/runtime-plugin'
		);
		const { ensureAgentHarnessRuntimeActivated } = await import('../../../../src/main/agent/harness/activation');

		registerAgentHarnessRuntimePluginActivation(makeLogger());

		await expect(
			ensureAgentHarnessRuntimeActivated({ runtime: 'broken-runtime', provider: 'openai', modelId: 'gpt-test' })
		).rejects.toThrow('Failed to load harness runtime plugin for broken-runtime');
	});
});
