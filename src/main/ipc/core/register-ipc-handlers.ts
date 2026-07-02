import type { ContainerInstance } from 'typedi';
import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { ProviderStoreIpc } from '../provider';
import { SpeechIpc } from '../speech';
import { SttIpc } from '../stt';
import { WindowIpc } from '../window';
import type { EventBus } from '../../app';
import { LoggerService } from '../../shared';
import { Agent } from '../../agent/agent';
import { ChannelRegistry } from '../../channels';
import { SttService } from '../../models/stt/service';
import { SpeechService } from '../../speech';

export function registerIpcHandlers(
	container: ContainerInstance,
	eventBus: EventBus
): void {
	const logger = container.get(LoggerService);

	const safeRegister = (name: string, register: () => void): void => {
		try {
			register();
		} catch (error) {
			logger.error('Bootstrap', `Failed to register IPC module: ${name}`, error);
		}
	};

	safeRegister('app', () =>
		new AppIpc().register(
			{ logger },
			eventBus
		)
	);
	safeRegister('agent', () =>
		new AgentIpc().register(
			{
				logger,
				agent: container.get(Agent),
			},
			eventBus
		)
	);
	safeRegister('channels', () =>
		new ChannelsIpc().register(
			{ logger, channelRegistry: container.get(ChannelRegistry) },
			eventBus
		)
	);
	safeRegister('provider-store', () => new ProviderStoreIpc().register(undefined, eventBus));
	safeRegister('speech', () =>
		new SpeechIpc().register({ speech: container.get(SpeechService) }, eventBus)
	);
	safeRegister('stt', () => new SttIpc().register({ stt: container.get(SttService) }, eventBus));
	safeRegister('window', () => new WindowIpc().register({ logger }, eventBus));

	logger.info('Bootstrap', 'Registered IPC modules');
}
