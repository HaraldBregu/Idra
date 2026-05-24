import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
	ConnectorSetupRegistry,
	FridayConnectorRegistry,
	buildFridayConnectorApi,
	defineSingleProviderPluginEntry,
	discoverConnectorManifests,
	loadConnectorEntry,
	loadConnectorManifestFile,
	normalizeConnectorManifest,
	resolveConnectorActivationPlan,
	type ConnectorManifestRecord,
} from '../../../../src/main/plugins';
import { clearAgentHarnessHookProviders } from '../../../../src/main/agent/harness/hook-runner';
import {
	clearAgentToolResultMiddlewareRegistrations,
	listAgentToolResultMiddlewareRegistrations,
} from '../../../../src/main/agent/harness/tool-result-middleware';
import { markCoreTool, type AgentTool } from '../../../../src/main/tools/common';
import { textResult } from '../../../../src/main/tools/results';
import { makeTempDir } from '../test-helpers';

function tool(name: string): AgentTool {
	return markCoreTool({
		name,
		description: `${name} description`,
		parameters: { type: 'object', properties: {}, additionalProperties: false },
		execute: jest.fn(async () => textResult(`${name} ok`)),
	});
}

function record(manifest: unknown, overrides: Partial<ConnectorManifestRecord> = {}): ConnectorManifestRecord {
	const normalized = normalizeConnectorManifest(manifest);
	if (!normalized.manifest) throw new Error('invalid test manifest');
	return {
		id: normalized.manifest.id,
		manifest: normalized.manifest,
		manifestPath: '/tmp/plugin/friday.plugin.json',
		rootDir: '/tmp/plugin',
		origin: 'workspace',
		source: '/tmp/plugin/index.ts',
		...overrides,
	};
}

describe('Friday-style connector runtime', () => {
	beforeEach(() => {
		clearAgentHarnessHookProviders();
		clearAgentToolResultMiddlewareRegistrations();
	});

	it('loads and normalizes manifest ownership metadata', async () => {
		const dir = await makeTempDir('friday-plugin-manifest-');
		const manifestPath = path.join(dir, 'friday.plugin.json');
		await fs.writeFile(
			manifestPath,
			JSON.stringify({
				id: 'Demo.Tools',
				providers: ['demo-ai'],
				channels: ['demo-chat'],
				providerAuthEnvVars: { 'demo-ai': ['DEMO_API_KEY', ''] },
				contracts: { tools: ['demo_search', 'demo_search'] },
				toolMetadata: { demo_search: { optional: true } },
			}),
			'utf8'
		);

		const loaded = loadConnectorManifestFile(manifestPath);

		expect(loaded.ok).toBe(true);
		if (!loaded.ok) throw new Error('expected manifest to load');
		expect(loaded.manifest).toMatchObject({
			id: 'demo.tools',
			name: 'demo.tools',
			providers: ['demo-ai'],
			channels: ['demo-chat'],
			providerAuthEnvVars: { 'demo-ai': ['DEMO_API_KEY'] },
			contracts: { tools: ['demo_search'] },
		});
		expect(loaded.manifest.toolMetadata.demo_search?.optional).toBe(true);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('discovers manifests without importing runtime entries and rejects symlink escapes', async () => {
		const root = await makeTempDir('friday-plugin-root-');
		const outside = await makeTempDir('friday-plugin-outside-');
		await fs.writeFile(
			path.join(outside, 'friday.plugin.json'),
			JSON.stringify({ id: 'outside', contracts: { tools: ['x'] } }),
			'utf8'
		);
		await fs.symlink(path.join(outside, 'friday.plugin.json'), path.join(root, 'friday.plugin.json'));

		const result = discoverConnectorManifests({
			roots: [{ rootDir: root, origin: 'workspace' }],
		});

		expect(result.records).toHaveLength(0);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain('source_escapes_root');
		await fs.rm(root, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('plans activation from manifest-owned providers, channels, commands, routes, tools, and capabilities', () => {
		const records = [
			record({
				id: 'multi',
				providers: ['demo-ai'],
				channels: ['demo-chat'],
				commandAliases: ['demo'],
				activation: {
					onRoutes: ['webhook'],
					onAgentHarnesses: ['assistant-runtime'],
					onCapabilities: ['hook'],
				},
				setup: { providers: [{ id: 'setup-ai', envVars: ['SETUP_API_KEY'] }] },
				contracts: { tools: ['demo_search'], agentToolResultMiddleware: ['audit'] },
			}),
		];

		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'provider', provider: 'demo-ai' } }).entries[0]?.reasons).toContain('manifest-provider-owner');
		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'provider', provider: 'setup-ai' } }).entries[0]?.reasons).toContain('manifest-setup-provider-owner');
		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'channel', channel: 'demo-chat' } }).pluginIds).toEqual(['multi']);
		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'command', command: 'demo' } }).entries[0]?.reasons).toContain('manifest-command-alias');
		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'route', route: 'webhook' } }).pluginIds).toEqual(['multi']);
		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'tool', tool: 'demo_search' } }).entries[0]?.reasons).toContain('manifest-tool-contract');
		expect(resolveConnectorActivationPlan({ records, trigger: { kind: 'capability', capability: 'hook' } }).entries[0]?.reasons).toEqual(expect.arrayContaining(['activation-capability-hint', 'manifest-hook-owner']));
	});

	it('enforces contracts.tools for tool registration and metadata ownership', () => {
		const registry = new FridayConnectorRegistry();
		const demo = record({ id: 'demo', contracts: { tools: ['declared'] } });
		const api = buildFridayConnectorApi({ record: demo, registry, registrationMode: 'full' });

		expect(() => api.registerTool(tool('undeclared'))).toThrow('undeclared tool');
		api.registerTool(tool('declared'));
		api.registerToolMetadata({ name: 'declared', optional: true, label: 'Declared' });

		const other = record(
			{ id: 'other', contracts: { tools: ['declared'] } },
			{ source: '/tmp/other/index.ts', rootDir: '/tmp/other', manifestPath: '/tmp/other/friday.plugin.json' }
		);
		const otherApi = buildFridayConnectorApi({ record: other, registry, registrationMode: 'full' });

		expect(() => otherApi.registerToolMetadata({ name: 'declared' })).toThrow('already owned');
		expect(registry.listTools()).toHaveLength(1);
		expect(registry.listDiagnostics().map((diagnostic) => diagnostic.code)).toEqual(expect.arrayContaining(['undeclared_tool_registration', 'tool_owner_conflict']));
	});

	it('supports optional tool factories returning null for unavailable contexts', async () => {
		const registry = new FridayConnectorRegistry();
		const demo = record({ id: 'demo', contracts: { tools: ['maybe_tool'] } });
		const api = buildFridayConnectorApi({ record: demo, registry, registrationMode: 'full' });
		const factory = jest.fn(() => null);

		api.registerTool({ name: 'maybe_tool', optional: true, factory });

		await expect(registry.resolveTools({ sandboxed: true })).resolves.toEqual([]);
		expect(factory).toHaveBeenCalledWith({ sandboxed: true });
	});

	it('registers runtime hooks and tool-result middleware through the connector API', () => {
		const registry = new FridayConnectorRegistry();
		const demo = record({ id: 'demo', activation: { onCapabilities: ['hook'] }, contracts: {} });
		const api = buildFridayConnectorApi({ record: demo, registry, registrationMode: 'full' });
		const hook = jest.fn();
		const middleware = jest.fn((blocks) => blocks);

		api.registerHook('agent_end', hook);
		api.registerAgentToolResultMiddleware({
			name: 'audit',
			runtime: 'pi',
			handler: middleware,
		});

		expect(registry.listValues('hooks')).toHaveLength(1);
		expect(registry.listValues('agentToolResultMiddleware')).toHaveLength(1);
		expect(listAgentToolResultMiddlewareRegistrations()).toEqual([
			expect.objectContaining({ name: 'audit', runtime: 'pi' }),
		]);
	});

	it('suppresses unavailable registration surfaces by mode while keeping CLI metadata available', () => {
		const registry = new FridayConnectorRegistry();
		const demo = record({ id: 'demo', providers: ['demo-ai'], contracts: { tools: ['declared'] } });
		const setupOnly = buildFridayConnectorApi({ record: demo, registry, registrationMode: 'setup-only' });
		const cliMetadata = buildFridayConnectorApi({ record: demo, registry, registrationMode: 'cli-metadata' });

		setupOnly.registerTool(tool('declared'));
		setupOnly.registerProvider({ id: 'demo-ai' });
		cliMetadata.registerCommand({ id: 'demo' });
		cliMetadata.registerProvider({ id: 'demo-ai' });

		expect(registry.listTools()).toHaveLength(0);
		expect(registry.listProviders()).toHaveLength(0);
		expect(registry.listValues('commands')).toHaveLength(1);
	});

	it('registers provider auth and catalog metadata through the single-provider helper', async () => {
		const registry = new FridayConnectorRegistry();
		const demo = record({ id: 'deepseek', providers: ['deepseek'], contracts: {} });
		const entry = defineSingleProviderPluginEntry({
			id: 'deepseek',
			name: 'DeepSeek',
			description: 'DeepSeek provider',
			provider: {
				label: 'DeepSeek',
				docsPath: 'docs/providers/deepseek.md',
				envVars: ['DEEPSEEK_API_KEY'],
				aliases: ['deepseek-chat'],
				auth: [{ method: 'api-key', envVar: 'DEEPSEEK_API_KEY' }],
				modelCatalog: {
					kinds: ['text'],
					staticCatalog: [{ model: 'deepseek-chat' }],
				},
			},
		});

		await entry.register(buildFridayConnectorApi({ record: demo, registry, registrationMode: 'full' }));

		expect(registry.listProviders()[0]?.value).toMatchObject({
			id: 'deepseek',
			label: 'DeepSeek',
			envVars: ['DEEPSEEK_API_KEY'],
		});
		expect(registry.listModelCatalogProviders()[0]?.value).toMatchObject({
			provider: 'deepseek',
			kinds: ['text'],
		});
	});

	it('loads runtime entries through mode-scoped APIs', async () => {
		const registry = new FridayConnectorRegistry();
		const demo = record({ id: 'demo', contracts: { tools: ['declared'] } });
		const entry = {
			id: 'demo',
			name: 'Demo',
			description: 'Demo entry',
			configSchema: {},
			register(api: ReturnType<typeof buildFridayConnectorApi>) {
				api.registerTool(tool('declared'));
			},
		};

		const loaded = await loadConnectorEntry({
			record: demo,
			registry,
			mode: 'tool-discovery',
			importer: jest.fn(async () => ({ default: entry })),
		});

		expect(loaded.ok).toBe(true);
		expect(registry.listTools()).toHaveLength(1);
	});

	it('builds setup descriptors from manifests without importing runtime code', () => {
		const demo = record({
			id: 'setup-demo',
			name: 'Setup Demo',
			description: 'Setup only',
			providerAuthEnvVars: { 'setup-ai': ['SETUP_API_KEY'] },
			channelEnvVars: { slack: ['SLACK_BOT_TOKEN'] },
			setup: {
				providers: [{ id: 'setup-ai', authMethods: ['api-key'], envVars: ['SETUP_API_KEY'] }],
				requiresRuntime: false,
			},
		});

		const registry = ConnectorSetupRegistry.fromManifestRecords([demo]);

		expect(registry.get('setup-demo')).toMatchObject({
			pluginId: 'setup-demo',
			providers: [{ id: 'setup-ai', authMethods: ['api-key'], envVars: ['SETUP_API_KEY'] }],
			providerAuthEnvVars: { 'setup-ai': ['SETUP_API_KEY'] },
			channelEnvVars: { slack: ['SLACK_BOT_TOKEN'] },
			requiresRuntime: false,
		});
	});
});
