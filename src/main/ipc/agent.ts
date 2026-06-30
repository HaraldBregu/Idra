import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { wrapSimpleHandler } from './core/error-handler';
import { AgentChannels } from '../../shared/ipc/ipc-channels';
import type { AgentService, AgentSendOptions } from '../agent/main';
import type { LoggerService } from '../shared';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers/definitions';
import type { ModelReasoningEffort } from '../../shared/agent/types';

export interface AgentIpcDeps {
	logger: LoggerService;
	agent: AgentService;
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
				const providerId = agent.settings.getProviderId();
				return providerId ? toPublicProvider(providerId) : undefined;
			}, AgentChannels.getProvider)
		);

		ipcMain.handle(
			AgentChannels.setProvider,
			wrapSimpleHandler((provider: PublicProvider): boolean => {
				if (!provider.id) return false;
				agent.settings.setProviderId(provider.id);
				return true;
			}, AgentChannels.setProvider)
		);

		ipcMain.handle(
			AgentChannels.getModelId,
			wrapSimpleHandler((): string | undefined => {
				return settings.getModelId();
			}, AgentChannels.getModelId)
		);

		ipcMain.handle(
			AgentChannels.setModelId,
			wrapSimpleHandler((modelId: string): boolean => {
				const trimmed = modelId.trim();
				if (!trimmed) return false;
				settings.setModelId(trimmed);
				return true;
			}, AgentChannels.setModelId)
		);

		logger.info('AgentIpc', `Registered ${this.name} module`);
	}
}
