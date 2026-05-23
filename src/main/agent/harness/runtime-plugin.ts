import path from 'node:path';
import { app } from 'electron';

import { registerAgentHarnessRuntimeActivator, registerAgentHarnessRuntimeManifestLoader } from './activation';
import type { LoggerService } from '../../logger';
import { FridayConnectorRegistry } from '../../plugins/registry';
import { resolveConnectorActivationPlan } from '../../plugins/activation-planner';
import {
	discoverConnectorManifests,
	type ConnectorManifestRecord,
	type ConnectorDiscoverySource,
} from '../../plugins/discovery';
import { loadConnectorEntry } from '../../plugins/loader';

const LOG_SOURCE = 'agent-harness-runtime-plugin';

type ActivationState = {
	manifests?: ConnectorManifestRecord[];
	pendingDiscovery?: Promise<ConnectorManifestRecord[]>;
	loadedRuntimePlugins: Set<string>;
	connectorRegistry: FridayConnectorRegistry;
};

const activationState: ActivationState = {
	loadedRuntimePlugins: new Set<string>(),
	connectorRegistry: new FridayConnectorRegistry(),
};

function normalizeRuntime(runtime: string): string {
	return runtime.trim().toLowerCase();
}

function resolveDiscoveryRoots(): ConnectorDiscoverySource[] {
	const userDataPath = app.getPath('userData');

	const roots = new Set<string>([
		path.resolve(process.cwd()),
		path.resolve(process.cwd(), 'src'),
		path.resolve(process.cwd(), 'src/main'),
		path.resolve(process.cwd(), 'dist'),
		app.getAppPath(),
		path.resolve(app.getAppPath(), 'dist'),
		path.join(userDataPath, 'plugins'),
		path.join(userDataPath, 'connectors'),
	]);

	return [...roots]
		.filter((rootDir) => Boolean(rootDir))
		.map((rootDir) => ({
			rootDir,
			origin: rootDir.startsWith(userDataPath) ? 'installed' : 'bundled',
		}));
}

function diagnosticsMessage(runtime: string, diagnostics: readonly { level: string; message: string }[]): string {
	if (diagnostics.length === 0) {
		return `Failed to load harness runtime plugin for ${runtime}.`;
	}
	return diagnostics
		.map((item) => `[${item.level}] ${item.message}`)
		.join('; ');
}

function logConnectorDiagnostics(
	logger: LoggerService | undefined,
	diagnostic: { level: string; message: string; code?: string; source?: string; details?: Record<string, unknown> },
	runtime: string
): void {
	if (!logger) return;
	const payload = {
		runtime,
		code: diagnostic.code,
		source: diagnostic.source,
		details: diagnostic.details,
	};
	if (diagnostic.level === 'warn') {
		logger.warn(LOG_SOURCE, diagnostic.message, payload);
		return;
	}
	logger.error(LOG_SOURCE, diagnostic.message, payload);
}

async function discoverConnectorManifestsForRuntime(
	runtime: string,
	logger?: LoggerService
): Promise<ConnectorManifestRecord[]> {
	if (activationState.manifests) {
		return activationState.manifests;
	}
	if (activationState.pendingDiscovery) {
		return activationState.pendingDiscovery;
	}

	const discoverTask = (async () => {
		const result = discoverConnectorManifests({
			roots: resolveDiscoveryRoots(),
			maxDepth: 6,
		});

		for (const diagnostic of result.diagnostics) {
			logConnectorDiagnostics(logger, diagnostic, runtime);
		}

		activationState.manifests = result.records;
		activationState.pendingDiscovery = undefined;
		return result.records;
	})();
	activationState.pendingDiscovery = discoverTask;

	try {
		return await discoverTask;
	} catch (error) {
		activationState.pendingDiscovery = undefined;
		throw error;
	}
}

async function ensureRuntimePluginActivation(
	runtime: string,
	logger?: LoggerService
): Promise<void> {
	const normalizedRuntime = normalizeRuntime(runtime);
	if (!normalizedRuntime || normalizedRuntime === 'auto' || normalizedRuntime === 'pi') {
		return;
	}

	const records = await discoverConnectorManifestsForRuntime(normalizedRuntime, logger);
	const plan = resolveConnectorActivationPlan({
		trigger: { kind: 'agentHarness', runtime: normalizedRuntime },
		records,
	});
	if (plan.pluginIds.length === 0) {
		throw new Error(`No agent harness runtime plugin candidates found for ${normalizedRuntime}.`);
	}

	const planPluginIds = new Set(plan.pluginIds);
	const manifestById = new Map(records.map((record) => [record.id, record]));
	let activatedAny = false;
	for (const pluginId of planPluginIds) {
		if (activationState.loadedRuntimePlugins.has(pluginId)) {
			activatedAny = true;
			continue;
		}

		const record = manifestById.get(pluginId);
		if (!record) {
			logger?.warn(LOG_SOURCE, 'Connector manifest referenced by harness activation plan was not found.', {
				runtime: normalizedRuntime,
				pluginId,
			});
			continue;
		}
		if (!record.source) {
			logger?.error(LOG_SOURCE, 'Connector manifest has no runtime entry for harness activation.', {
				runtime: normalizedRuntime,
				pluginId: record.id,
				source: record.manifestPath,
			});
			continue;
		}

		const result = await loadConnectorEntry({
			record,
			registry: activationState.connectorRegistry,
			mode: 'full',
		});
			for (const diagnostic of result.diagnostics) {
				logConnectorDiagnostics(logger, diagnostic, normalizedRuntime);
			}
			if (!result.ok) {
				const diagnostics = result.diagnostics.map((item) => ({
					level: item.level,
					message: item.message,
				}));
				const message = diagnosticsMessage(normalizedRuntime, diagnostics);
				throw new Error(message);
			}

		activationState.loadedRuntimePlugins.add(pluginId);
		activatedAny = true;
	}

	if (!activatedAny) {
		throw new Error(`No harness runtime plugin entry could be loaded for ${normalizedRuntime}.`);
	}
}

export function registerAgentHarnessRuntimePluginActivation(logger?: LoggerService): void {
	registerAgentHarnessRuntimeManifestLoader(async ({ triggerRuntime }) => {
		const runtime = normalizeRuntime(triggerRuntime);
		const records = await discoverConnectorManifestsForRuntime(runtime, logger);
		const plan = resolveConnectorActivationPlan({
			trigger: { kind: 'agentHarness', runtime },
			records,
		});
		const runtimePluginIds = new Set(plan.pluginIds);
		return records.filter((record) => runtimePluginIds.has(record.id));
	});

	registerAgentHarnessRuntimeActivator({
		activate: async (params) => {
			await ensureRuntimePluginActivation(params.runtime, logger);
		},
	});
}
