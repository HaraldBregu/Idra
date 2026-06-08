import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './core/error-handler';
import { AgentChannels } from '../../shared/ipc-channels';
import type { AgentSendRuntimeOptions } from '../../shared/agents/service';
import type { AgentSendOptions } from '../agent_v2';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

export function normalizeAgentSendRuntimeOptions(options: unknown): AgentSendOptions {
	if (options === undefined || options === null) return {};
	if (!isRecord(options)) throw new Error('Invalid assistant runtime options.');

	const sessionId =
		optionalTrimmedString(options.sessionId) ?? optionalTrimmedString(options.agentRuntime);
	return {
		...(optionalTrimmedString(options.runId) ? { runId: optionalTrimmedString(options.runId) } : {}),
		...(sessionId ? { sessionId } : {}),
		...(optionalTrimmedString(options.providerId)
			? { providerId: optionalTrimmedString(options.providerId) }
			: {}),
		...(optionalTrimmedString(options.model) ? { model: optionalTrimmedString(options.model) } : {}),
	};
}

export class AgentIpc implements IpcModule {
	readonly name = 'agent';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const logger = container.get('logger');
		const agent = container.get('agentService');

		ipcMain.handle(
			AgentChannels.sendV2,
			wrapSimpleHandler(async (message: string, options?: AgentSendRuntimeOptions): Promise<string> => {
				return agent.send(message, 'main', {
					...normalizeAgentSendRuntimeOptions(options),
					streamEvent: (event) => eventBus.broadcast(AgentChannels.response, event),
				});
			}, AgentChannels.sendV2)
		);

		ipcMain.handle(
			AgentChannels.cancel,
			wrapSimpleHandler((): void => {
				agent.cancel();
			}, AgentChannels.cancel)
		);

		logger.info('AgentIpc', `Registered ${this.name} module`);
	}
}
