import path from 'node:path';
import { app } from 'electron';
import { registerAgentHarnessRuntimeActivator, registerAgentHarnessRuntimeManifestLoader } from './activation';
import type { LoggerService } from '../logger';
import { FridayConnectorRegistry } from '../plugins/registry';
import { resolveConnectorActivationPlan } from '../plugins/activation-planner';
import { discoverConnectorManifests, type ConnectorManifestRecord } from '../plugins/discovery';
import type { ConnectorActivationPlan } from '../plugins/activation-planner';
import { loadConnectorEntry } from '../plugins/loader';

const LOG_SOURCE = 'agent-harness-runtime-plugin';

type DiscoveryState = {
	manifests?: ConnectorManifestRecord[];
	discoveryInFlight?: Promise<ConnectorManifestRecord[]>;
	loadedRuntimePlugins: Set<string>;
};

const discoveryState: DiscoveryState = {
	loadedRuntimePlugins: new Set<string>(),
};

function normalizeRuntime(runtime: string): string {
	return runtime.trim().toLowerCase();
}

function resolveDiscoveryRoots(): { rootDir: string; origin: 'bundled' | 'installed' | 'workspace' }[] {
	const cwd = path.resolve(process.cwd());
	const appPath = app.getAppPath();
	const userData = app.getPath('userData');

	return Array.from(
		new Set(
			[
				path.join(cwd, 'src'),
				path.join(cwd, 'dist'),
				path.join(cwd, 'build'),
				cwd,
				appPath,
				path.join(userData, 'connectors'),
				path.join(userData, 'plugins'),
			].map((value) => path.resolve(value))
		)
	).map((rootDir) => ({
		rootDir,
		origin: rootDir === userData ? 'installed' : 'bundled',
	}));
}

function isConnectorRuntimeError(plan: ConnectorActivationPlan, runtime: string): boolean {
	if (plan.pluginIds.length === 0) return false;
	return false;
}

function logDiagnostic(logger: LoggerService | undefined, level: 'warn' | 'error', record: ConnectorManifestRecord): void {
	if (!logger) return;
	const message = `Connector ${record.id} runtime activation failed. Ensure the manifest declares a valid runtime entry and exports an entry module.`;
	if (level === 'error') {
		logger.error(LOG_SOURCE, message, { pluginId: record.id, source: record.source });
		return;
	}
	logger.warn(LOG_SOURCE, message, { pluginId: record.id, source: record.source });
}

function diagnosticsMessage(runtime: string, diagnostics: Array<{ level: string; message: string }>): string {
	if (diagnostics.length === 0) {
		return `Failed to load harness runtime plugin for ${runtime}.`;
	}
	return diagnostics
		.map((item) => `[${item.level}] ${item.message}`)
		.join('; ');
}

async function discoverConnectorManifestsOnce(logger?: LoggerService): Promise<ConnectorManifestRecord[]> {
	if (discoveryState.manifests) {
		return discoveryState.manifests;
	}
	if (discoveryState.discoveryInFlight) {
		return discoveryState.discoveryInFlight;
	}

	discoveryState.discoveryInFlight = (async () => {
		const result = discoverConnectorManifests({
			roots: resolveDiscoveryRoots(),
			maxDepth: 6,
		});
		discoveryState.discoveryInFlight = undefined;
		if (result.diagnostics.length > 0 && logger) {
			for (const diagnostic of result.diagnostics) {
				if (diagnostic.level === 'warn') {
					logger.warn(LOG_SOURCE, diagnostic.message, {
						code: diagnostic.code,
						source: diagnostic.source,
						details: diagnostic.details,
					});
				} else {
					logger.error(LOG_SOURCE, diagnostic.message, {
						code: diagnostic.code,
						source: diagnostic.source,
						details: diagnostic.details,
					});
				}
			}
		}
		discoveryState.manifests = result.records;
		if (result.records.length === 0 && logger) {
			logger.debug(LOG_SOURCE, 'No connector manifests found for harness runtime activation scan.', {
				roots: resolveDiscoveryRoots(),
			});
		}
		return result.records;
	})();

	return discoveryState.discoveryInFlight;
}

async function ensureAgentHarnessRuntimePluginLoaded(
	runtime: string,
	logger?: LoggerService
): Promise<void> {
	const normalized = normalizeRuntime(runtime);
	if (!normalized || normalized === 'auto' || normalized === 'pi') {
		return;
	}

	const records = await discoverConnectorManifestsOnce(logger);
	const plan = resolveConnectorActivationPlan({
		trigger: { kind: 'agentHarness', runtime: normalized },
		records,
	});

	if (plan.pluginIds.length === 0) {
		return;
	}

	if (isConnectorRuntimeError(plan, normalized)) {
		return;
	}

	const registry = new FridayConnectorRegistry();
	for (const pluginId of plan.pluginIds) {
		if (discoveryState.loadedRuntimePlugins.has(pluginId)) {
			continue;
		}
		const record = records.find((entry) => entry.id === pluginId);
		if (!record) {
			if (logger) {
				logger.warn(LOG_SOURCE, 'Connector manifest referenced by harness activation plan was not found.', {
					runtime: normalized,
					pluginId,
				});
			}
			continue;
		}
		if (!record.source) {
			logDiagnostic(logger, 'warn', record);
			continue;
		}

		const result = await loadConnectorEntry({
			record,
			registry,
			mode: 'full',
		});

		for (const diagnostic of result.diagnostics) {
			if (diagnostic.level === 'warn') {
				logger?.warn(LOG_SOURCE, diagnostic.message, {
					pluginId: record.id,
					source: diagnostic.source,
					details: diagnostic.details,
				});
			} else {
				logger?.error(LOG_SOURCE, diagnostic.message, {
					pluginId: record.id,
					source: diagnostic.source,
					details: diagnostic.details,
				});
			}
		}

		if (!result.ok) {
			throw new Error(
				diagnosticsMessage(normalized,
					result.diagnostics.map((item) => ({ level: item.level, message: item.message }))
				)
			);
		}
		discoveryState.loadedRuntimePlugins.add(pluginId);
	}
}

function connectHarnessRuntimeManifestLoader(): void {
	registerAgentHarnessRuntimeManifestLoader(async ({ triggerRuntime }) => {
		const normalized = normalizeRuntime(triggerRuntime);
		return discoverConnectorManifestsOnce()
			.then((records) => {
				const plan = resolveConnectorActivationPlan({
					trigger: { kind: 'agentHarness', runtime: normalized },
					records,
				});
				return records.filter((record) => plan.pluginIds.includes(record.id));
			})
			.catch(() => []);
	});
}

export function registerAgentHarnessRuntimePluginActivation(logger?: LoggerService): void {
	connectHarnessRuntimeManifestLoader();
	registerAgentHarnessRuntimeActivator({
		activate: (params) => ensureAgentHarnessRuntimePluginLoaded(params.runtime, logger),
	});
}

