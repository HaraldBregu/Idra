import { BrowserWindow, dialog, ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../event_bus';
import { wrapSimpleHandler } from './core/error_handler';
import { AgentChannels } from '../../shared/ipc_channels_definitions';
import type { Agent, AgentSendOptions } from '../agent/agent';
import type { LoggerService } from '../shared';
import type { PublicProvider } from '../../shared/provider_types';
import { loadProviders } from '../models';
import type {
	AgentPermissionMode,
	AgentToolPermissionDecision,
	ModelReasoningEffort,
} from '../../shared/agent_types';
import { normalizeAgentInputFiles } from '../../shared/agent_files';
import { workspacePath } from '../agent/system';
import {
	getPermissions,
	resetPermissions,
	respondToolPermission,
	setDirectoryPermissions,
	setPermissionMode,
	setToolPermission,
	type DirectoryPermissions,
	type PermissionsSchema,
	type ToolPermission,
} from '../agent/policy';
import {
	getHealthSettings,
	resetHealthSettings,
	updateHealthSettings,
} from '../agent/health/health_store';
import { getHealthData, rescheduleHealth, saveHealthData } from '../agent/health';
import type { HealthSettings } from '../agent/health/health_types';
import { getModelId, getProviderId, setModelId, setProviderId } from '../agent/agent_store';
import {
	getRagConfiguration,
	indexRag,
	rescheduleRagIndexing,
	saveRagConfiguration,
	searchRag,
	type RagIndexResult,
	type RagMatch,
} from '../rag';
import type { RagConfiguration } from '../../shared/rag_types';

export interface AgentIpcDeps {
	logger: LoggerService;
	agent: Agent;
}

const TOOL_PERMISSION_DECISIONS: readonly AgentToolPermissionDecision[] = [
	'approve',
	'reject',
	'approve_always',
];

function isToolPermissionDecision(value: unknown): value is AgentToolPermissionDecision {
	return TOOL_PERMISSION_DECISIONS.includes(value as AgentToolPermissionDecision);
}

const MODEL_REASONING_EFFORTS: readonly ModelReasoningEffort[] = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
];

const AGENT_PERMISSION_MODES: readonly AgentPermissionMode[] = ['ask', 'bypass'];

function isAgentPermissionMode(value: unknown): value is AgentPermissionMode {
	return AGENT_PERMISSION_MODES.includes(value as AgentPermissionMode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function toToolPermission(value: unknown): ToolPermission {
	if (!isRecord(value)) throw new Error('Invalid tool permission.');
	if (value.default !== 'allow' && value.default !== 'ask' && value.default !== 'deny')
		throw new Error('Invalid default permission.');
	const list = (input: unknown): string[] => {
		if (!Array.isArray(input)) throw new Error('Invalid permission rules.');
		return [...new Set(input.map(optionalTrimmedString).filter((item): item is string => !!item))];
	};
	return {
		default: value.default,
		allow: list(value.allow),
		deny: list(value.deny),
		ask: list(value.ask),
	};
}

function toDirectoryPermissions(value: unknown): DirectoryPermissions {
	if (!isRecord(value)) throw new Error('Invalid directory permissions.');
	const result: DirectoryPermissions = {};
	for (const [rawDirectory, candidate] of Object.entries(value)) {
		const directory = optionalTrimmedString(rawDirectory);
		if (!directory || !isRecord(candidate) || typeof candidate.recoursive !== 'boolean')
			throw new Error('Invalid directory permission.');
		let tools: '*' | string[];
		if (candidate.tools === '*') tools = '*';
		else if (Array.isArray(candidate.tools))
			tools = [
				...new Set(
					candidate.tools.map(optionalTrimmedString).filter((tool): tool is string => !!tool)
				),
			];
		else throw new Error('Invalid directory tools.');
		result[directory] = { recoursive: candidate.recoursive, tools };
	}
	return result;
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
	const catalogProvider = loadProviders().find((provider) => provider.id === providerId);
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

function normalizeHealthSettingsPatch(value: Partial<HealthSettings>): Partial<HealthSettings> {
	return { ...value };
}

export function normalizeAgentSendRuntimeOptions(options: unknown): AgentSendOptions {
	if (options === undefined || options === null) return {};
	if (!isRecord(options)) throw new Error('Invalid assistant runtime options.');

	const sessionId =
		optionalTrimmedString(options.sessionId) ?? optionalTrimmedString(options.agentRuntime);
	const files = normalizeAgentInputFiles(options.files);
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
		...(isAgentPermissionMode(options.permissionMode)
			? { permissionMode: options.permissionMode }
			: {}),
		...(files ? { files } : {}),
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
			AgentChannels.respondToolPermission,
			wrapSimpleHandler((toolCallId: unknown, decision: unknown): boolean => {
				const id = optionalTrimmedString(toolCallId);
				if (!id) throw new Error('Invalid tool call id.');
				if (!isToolPermissionDecision(decision)) throw new Error('Invalid permission decision.');
				return respondToolPermission(id, decision);
			}, AgentChannels.respondToolPermission)
		);

		ipcMain.handle(
			AgentChannels.listSessions,
			wrapSimpleHandler(() => agent.listSessions(), AgentChannels.listSessions)
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
			AgentChannels.deleteSession,
			wrapSimpleHandler((sessionId: unknown): void => {
				agent.deleteSession(normalizeAgentSessionId(sessionId));
			}, AgentChannels.deleteSession)
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
			AgentChannels.policyGet,
			wrapSimpleHandler((): PermissionsSchema => getPermissions(), AgentChannels.policyGet)
		);

		ipcMain.handle(
			AgentChannels.policyPickDirectory,
			wrapSimpleHandler(async (): Promise<string | undefined> => {
				const window = BrowserWindow.getFocusedWindow();
				const options = {
					defaultPath: workspacePath(agent.config),
					properties: ['openDirectory' as const],
				};
				const result = await (window
					? dialog.showOpenDialog(window, options)
					: dialog.showOpenDialog(options));
				return result.canceled ? undefined : result.filePaths[0];
			}, AgentChannels.policyPickDirectory)
		);

		ipcMain.handle(
			AgentChannels.policySetTool,
			wrapSimpleHandler((toolName: unknown, value: unknown): PermissionsSchema => {
				const tool = optionalTrimmedString(toolName);
				if (!tool) throw new Error('Invalid tool name.');
				return setToolPermission(tool, toToolPermission(value));
			}, AgentChannels.policySetTool)
		);

		ipcMain.handle(
			AgentChannels.policySetDirectories,
			wrapSimpleHandler((value: unknown): PermissionsSchema => {
				return setDirectoryPermissions(toDirectoryPermissions(value));
			}, AgentChannels.policySetDirectories)
		);

		ipcMain.handle(
			AgentChannels.policySetMode,
			wrapSimpleHandler((mode: unknown): PermissionsSchema => {
				if (!isAgentPermissionMode(mode)) throw new Error('Invalid agent permission mode.');
				return setPermissionMode(mode);
			}, AgentChannels.policySetMode)
		);

		ipcMain.handle(
			AgentChannels.policyReset,
			wrapSimpleHandler((): PermissionsSchema => resetPermissions(), AgentChannels.policyReset)
		);

		ipcMain.handle(
			AgentChannels.healthSettings,
			wrapSimpleHandler(() => getHealthSettings(), AgentChannels.healthSettings)
		);

		ipcMain.handle(
			AgentChannels.healthSaveSettings,
			wrapSimpleHandler((request: Partial<HealthSettings>) => {
				const next = updateHealthSettings(normalizeHealthSettingsPatch(request));
				rescheduleHealth();
				return next;
			}, AgentChannels.healthSaveSettings)
		);

		ipcMain.handle(
			AgentChannels.healthResetSettings,
			wrapSimpleHandler(() => {
				const next = resetHealthSettings();
				rescheduleHealth();
				return next;
			}, AgentChannels.healthResetSettings)
		);

		ipcMain.handle(
			AgentChannels.healthData,
			wrapSimpleHandler(() => getHealthData(agent.config), AgentChannels.healthData)
		);

		ipcMain.handle(
			AgentChannels.healthSaveData,
			wrapSimpleHandler((content: unknown) => {
				if (typeof content !== 'string') throw new Error('Invalid health data content.');
				return saveHealthData(agent.config, content);
			}, AgentChannels.healthSaveData)
		);

		ipcMain.handle(
			AgentChannels.ragIndex,
			wrapSimpleHandler((): Promise<RagIndexResult> => {
				const configuration = getRagConfiguration();
				return indexRag(configuration.folders, configuration.indexName);
			}, AgentChannels.ragIndex)
		);

		ipcMain.handle(
			AgentChannels.ragGetConfiguration,
			wrapSimpleHandler(
				(): RagConfiguration => getRagConfiguration(),
				AgentChannels.ragGetConfiguration
			)
		);

		ipcMain.handle(
			AgentChannels.ragSaveConfiguration,
			wrapSimpleHandler((configuration: RagConfiguration): RagConfiguration => {
				const saved = saveRagConfiguration(configuration);
				rescheduleRagIndexing();
				return saved;
			}, AgentChannels.ragSaveConfiguration)
		);

		ipcMain.handle(
			AgentChannels.ragSearch,
			wrapSimpleHandler((query: unknown, topK: unknown): Promise<RagMatch[]> => {
				const text = optionalTrimmedString(query);
				if (!text) throw new Error('Invalid search query.');
				return searchRag(
					text,
					getRagConfiguration().indexName,
					typeof topK === 'number' ? topK : undefined
				);
			}, AgentChannels.ragSearch)
		);

		ipcMain.handle(
			AgentChannels.ragPickFolder,
			wrapSimpleHandler(async (): Promise<string | undefined> => {
				const window = BrowserWindow.getFocusedWindow();
				const options = {
					defaultPath: workspacePath(agent.config),
					properties: ['openDirectory' as const],
				};
				const result = await (window
					? dialog.showOpenDialog(window, options)
					: dialog.showOpenDialog(options));
				return result.canceled ? undefined : result.filePaths[0];
			}, AgentChannels.ragPickFolder)
		);

		logger.info('AgentIpc', `Registered ${this.name} module`);
	}
}
