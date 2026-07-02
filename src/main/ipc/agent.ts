import { ipcMain } from 'electron';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { wrapSimpleHandler } from './core/error-handler';
import { AgentChannels } from '../../shared/ipc_channels.definitions';
import type { Agent, AgentSendOptions } from '../agent/agent';
import { getRuntime, listSchedules, setRuntime } from '../agent/cron';
import * as skills from '../agent/skills';
import {
	createOAuthProvider,
	getMcpOauth,
	getMcpServers,
	saveMcpOauth,
	setMcpServers,
	type McpOAuthStorage,
} from '../agent/mcp';
import type { LoggerService } from '../shared';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers.definitions';
import type { ModelReasoningEffort } from '../../shared/agent.types';
import { getHealthSettings, resetHealthSettings, updateHealthSettings } from '../agent/health/health-store';
import type { HealthSettings } from '../agent/health/health-types';
import { getModelId, getProviderId, setModelId, setProviderId } from '../agent/settings/settings-store';
import type { McpData, McpOAuthStart, McpSettings } from '../../shared/mcp';

export interface AgentIpcDeps {
	logger: LoggerService;
	agent: Agent;
}

const MODEL_REASONING_EFFORTS: readonly ModelReasoningEffort[] = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

function normalizeAgentSessionId(value: unknown): string {
	const sessionId = optionalTrimmedString(value);
	if (!sessionId) throw new Error('Invalid assistant session id.');
	return sessionId;
}

function toPublicProvider(providerId: string): PublicProvider | undefined {
	const catalogProvider = DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
	if (!catalogProvider) return undefined;
	return {
		id: catalogProvider.id,
		name: catalogProvider.name,
		baseUrl: catalogProvider.baseUrl,
		...(catalogProvider.capabilities ? { capabilities: catalogProvider.capabilities } : {}),
		...(catalogProvider.apiConfiguration
			? { apiConfiguration: catalogProvider.apiConfiguration }
			: {}),
	};
}

function resolveMcpId(value: string | undefined): string {
	const id = value?.trim().toLowerCase();
	if (!id) throw new Error('Connector ID is required.');
	return id;
}

function inferMcpType(entry: McpData): McpData {
	const shape = entry as { type?: string; command?: unknown; url?: unknown };
	if (shape.type) return entry;
	if (typeof shape.command === 'string') return { ...entry, type: 'stdio' } as McpData;
	if (typeof shape.url === 'string') return { ...entry, type: 'http' } as McpData;
	return entry;
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (!isRecord(value)) return false;
	return Object.values(value).every((item) => typeof item === 'string');
}

function hasCommonMcpFields(value: Record<string, unknown>): boolean {
	return (
		(value.name === undefined || typeof value.name === 'string') &&
		(value.require_approval === undefined ||
			value.require_approval === 'always' ||
			value.require_approval === 'never') &&
		(value.defer_loading === undefined || typeof value.defer_loading === 'boolean') &&
		(value.enabled === undefined || typeof value.enabled === 'boolean') &&
		(value.created_at === undefined || typeof value.created_at === 'string') &&
		(value.updated_at === undefined || typeof value.updated_at === 'string') &&
		(value.last_error === undefined || typeof value.last_error === 'string')
	);
}

function isMcpEntry(value: unknown): value is McpData {
	if (!isRecord(value)) return false;
	if (value.type === 'stdio') {
		return (
			typeof value.command === 'string' &&
			(value.args === undefined || Array.isArray(value.args)) &&
			(value.env === undefined || isStringRecord(value.env)) &&
			(value.cwd === undefined || typeof value.cwd === 'string') &&
			hasCommonMcpFields(value)
		);
	}
	if (value.type === 'http') {
		return (
			typeof value.url === 'string' &&
			(value.token === undefined || typeof value.token === 'string') &&
			(value.client_id === undefined || typeof value.client_id === 'string') &&
			(value.client_secret === undefined || typeof value.client_secret === 'string') &&
			hasCommonMcpFields(value)
		);
	}
	return false;
}

function normalizeMcpSettings(value: unknown): McpSettings {
	if (!isRecord(value)) return {};
	const connectors: McpSettings = {};
	for (const [rawId, rawEntry] of Object.entries(value)) {
		const id = rawId.trim().toLowerCase();
		if (!id || !isMcpEntry(rawEntry)) continue;
		connectors[id] = rawEntry;
	}
	return connectors;
}

function normalizeHealthSettingsPatch(value: Partial<HealthSettings>): Partial<HealthSettings> {
	return { ...value };
}

export function normalizeAgentSendRuntimeOptions(options: unknown): AgentSendOptions {
	if (options === undefined || options === null) return {};
	if (!isRecord(options)) throw new Error('Invalid assistant runtime options.');

	const sessionId =
		optionalTrimmedString(options.sessionId) ?? optionalTrimmedString(options.agentRuntime);
	return {
		...(optionalTrimmedString(options.runId)
			? { runId: optionalTrimmedString(options.runId) }
			: {}),
		...(sessionId ? { sessionId } : {}),
		...(optionalTrimmedString(options.providerId)
			? { providerId: optionalTrimmedString(options.providerId) }
			: {}),
		...(optionalTrimmedString(options.model)
			? { modelId: optionalTrimmedString(options.model) }
			: {}),
		...(isModelReasoningEffort(options.effort) ? { effort: options.effort } : {}),
	};
}

export class AgentIpc implements IpcModule<AgentIpcDeps> {
	readonly name = 'agent';

	register({ logger, agent }: AgentIpcDeps, eventBus: EventBus): void {

		ipcMain.handle(
			AgentChannels.send,
			wrapSimpleHandler(async (message: string, options?: unknown): Promise<string> => {
				return agent.send(message, 'main', {
					...normalizeAgentSendRuntimeOptions(options),
					streamEvent: (event) => eventBus.broadcast(AgentChannels.response, event),
				});
			}, AgentChannels.send)
		);

		ipcMain.handle(
			AgentChannels.cancel,
			wrapSimpleHandler((): void => {
				agent.cancel();
			}, AgentChannels.cancel)
		);

		ipcMain.handle(
			AgentChannels.lastMessages,
			wrapSimpleHandler((sessionId: unknown) => {
				return agent.getLastMessages(normalizeAgentSessionId(sessionId));
			}, AgentChannels.lastMessages)
		);

		ipcMain.handle(
			AgentChannels.clearMessages,
			wrapSimpleHandler((sessionId: unknown): void => {
				agent.clearMessages(normalizeAgentSessionId(sessionId));
			}, AgentChannels.clearMessages)
		);

		ipcMain.handle(
			AgentChannels.getProvider,
			wrapSimpleHandler((): PublicProvider | undefined => {
				const providerId = getProviderId();
				return providerId ? toPublicProvider(providerId) : undefined;
			}, AgentChannels.getProvider)
		);

		ipcMain.handle(
			AgentChannels.setProvider,
			wrapSimpleHandler((provider: PublicProvider): boolean => {
				if (!provider.id) return false;
				setProviderId(provider.id);
				return true;
			}, AgentChannels.setProvider)
		);

		ipcMain.handle(
			AgentChannels.getModelId,
			wrapSimpleHandler((): string | undefined => {
				return getModelId();
			}, AgentChannels.getModelId)
		);

		ipcMain.handle(
			AgentChannels.setModelId,
			wrapSimpleHandler((modelId: string): boolean => {
				const trimmed = modelId.trim();
				if (!trimmed) return false;
				setModelId(trimmed);
				return true;
			}, AgentChannels.setModelId)
		);

		ipcMain.handle(
			AgentChannels.cronList,
			wrapSimpleHandler(() => listSchedules(), AgentChannels.cronList)
		);

		ipcMain.handle(
			AgentChannels.cronGetRuntime,
			wrapSimpleHandler(() => getRuntime(), AgentChannels.cronGetRuntime)
		);

		ipcMain.handle(
			AgentChannels.cronSetRuntime,
			wrapSimpleHandler((providerId: string, modelId: string) => {
				return setRuntime(providerId, modelId);
			}, AgentChannels.cronSetRuntime)
		);

		ipcMain.handle(
			AgentChannels.skillsList,
			wrapSimpleHandler(() => skills.list(), AgentChannels.skillsList)
		);

		ipcMain.handle(
			AgentChannels.skillsLoad,
			wrapSimpleHandler((name: string) => skills.loadSkill(name), AgentChannels.skillsLoad)
		);

		ipcMain.handle(
			AgentChannels.skillsImport,
			wrapSimpleHandler(() => skills.importSkills(), AgentChannels.skillsImport)
		);

		ipcMain.handle(
			AgentChannels.skillsDownload,
			wrapSimpleHandler((name: string) => skills.downloadSkill(name), AgentChannels.skillsDownload)
		);

		ipcMain.handle(
			AgentChannels.skillsDelete,
			wrapSimpleHandler((name: string) => skills.deleteSkill(name), AgentChannels.skillsDelete)
		);

		ipcMain.handle(
			AgentChannels.skillsSetEnabled,
			wrapSimpleHandler((id: string, enabled: boolean) => {
				return skills.setEnabled(id, enabled);
			}, AgentChannels.skillsSetEnabled)
		);

		ipcMain.handle(
			AgentChannels.skillsOpenRoot,
			wrapSimpleHandler(() => skills.openRoot(), AgentChannels.skillsOpenRoot)
		);

		ipcMain.handle(
			AgentChannels.skillsGetRoot,
			wrapSimpleHandler(() => skills.getRoot(), AgentChannels.skillsGetRoot)
		);

		ipcMain.handle(
			AgentChannels.healthSettings,
			wrapSimpleHandler(() => getHealthSettings(), AgentChannels.healthSettings)
		);

		ipcMain.handle(
			AgentChannels.healthSaveSettings,
			wrapSimpleHandler((request: Partial<HealthSettings>) => {
				return updateHealthSettings(normalizeHealthSettingsPatch(request));
			}, AgentChannels.healthSaveSettings)
		);

		ipcMain.handle(
			AgentChannels.healthResetSettings,
			wrapSimpleHandler(() => resetHealthSettings(), AgentChannels.healthResetSettings)
		);

		const listMcp = (): McpSettings => {
			const servers = getMcpServers();
			const out: McpSettings = {};
			for (const [id, entry] of Object.entries(servers)) out[id] = inferMcpType(entry);
			return out;
		};

		const oauthStorage = (id: string): McpOAuthStorage => ({
			load: () => getMcpOauth(id),
			save: (state) => saveMcpOauth(id, state),
		});

		const getHttpMcpServer = (id: string): {
			id: string;
			url: string;
			clientId?: string;
			clientSecret?: string;
		} => {
			const connectorId = resolveMcpId(id);
			const entry = listMcp()[connectorId];
			if (!entry || entry.type !== 'http') throw new Error(`No http MCP server "${id}".`);
			return {
				id: connectorId,
				url: entry.url,
				clientId: entry.client_id,
				clientSecret: entry.client_secret,
			};
		};

		ipcMain.handle(
			AgentChannels.mcpList,
			wrapSimpleHandler(() => listMcp(), AgentChannels.mcpList)
		);

		ipcMain.handle(
			AgentChannels.mcpGet,
			wrapSimpleHandler((id: string) => {
				const connectorId = resolveMcpId(id);
				const connector = listMcp()[connectorId];
				return connector ? { [connectorId]: connector } : {};
			}, AgentChannels.mcpGet)
		);

		ipcMain.handle(
			AgentChannels.mcpSave,
			wrapSimpleHandler((input: McpSettings) => {
				const next = normalizeMcpSettings(input);
				setMcpServers(next);
				return next;
			}, AgentChannels.mcpSave)
		);

		ipcMain.handle(
			AgentChannels.mcpDelete,
			wrapSimpleHandler((id: string) => {
				const connectorId = resolveMcpId(id);
				const next = { ...listMcp() };
				delete next[connectorId];
				setMcpServers(next);
			}, AgentChannels.mcpDelete)
		);

		ipcMain.handle(
			AgentChannels.mcpOauthStart,
			wrapSimpleHandler(async (id: string): Promise<McpOAuthStart> => {
				const server = getHttpMcpServer(id);
				let redirectUrl: string | undefined;
				const result = await auth(
					createOAuthProvider({
						storage: oauthStorage(server.id),
						clientId: server.clientId,
						clientSecret: server.clientSecret,
						onRedirect: (url) => {
							redirectUrl = url.toString();
						},
					}),
					{ serverUrl: server.url }
				);
				if (result === 'AUTHORIZED') return { status: 'authorized' };
				if (redirectUrl) return { status: 'redirect', url: redirectUrl };
				throw new Error(`MCP server "${id}" did not return an authorization URL.`);
			}, AgentChannels.mcpOauthStart)
		);

		ipcMain.handle(
			AgentChannels.mcpOauthFinish,
			wrapSimpleHandler(async (id: string, code: string): Promise<void> => {
				const server = getHttpMcpServer(id);
				const result = await auth(
					createOAuthProvider({
						storage: oauthStorage(server.id),
						clientId: server.clientId,
						clientSecret: server.clientSecret,
					}),
					{ serverUrl: server.url, authorizationCode: code }
				);
				if (result !== 'AUTHORIZED') throw new Error(`OAuth authorization failed for "${id}".`);
			}, AgentChannels.mcpOauthFinish)
		);

		logger.info('AgentIpc', `Registered ${this.name} module`);
	}
}
