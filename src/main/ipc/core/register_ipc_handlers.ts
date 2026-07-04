import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { ImageIpc } from '../image';
import { ProviderStoreIpc } from '../provider';
import { SpeechIpc } from '../speech';
import { SttIpc } from '../stt';
import { TextIpc } from '../text';
import { WindowIpc } from '../window';
import type { EventBus } from '../../app';
import type { MainServices } from '../../bootstrap';

export function registerIpcHandlers(services: MainServices, eventBus: EventBus): void {
	const { logger, agentService, channelRegistry } = services;

	const safeRegister = (name: string, register: () => void): void => {
		try {
			register();
		} catch (error) {
			logger.error('Bootstrap', `Failed to register IPC module: ${name}`, error);
		}
	};

	safeRegister('app', () => new AppIpc().register({ logger }, eventBus));
	safeRegister('agent', () => new AgentIpc().register({ logger, agent: agentService }, eventBus));
	safeRegister('channels', () =>
		new ChannelsIpc().register({ logger, channelRegistry }, eventBus)
	);
	safeRegister('image', () => new ImageIpc().register(undefined, eventBus));
	safeRegister('provider-store', () => new ProviderStoreIpc().register(undefined, eventBus));
	safeRegister('speech', () => new SpeechIpc().register(undefined, eventBus));
	safeRegister('stt', () => new SttIpc().register(undefined, eventBus));
	safeRegister('text', () => new TextIpc().register(undefined, eventBus));
	safeRegister('window', () => new WindowIpc().register({ logger }, eventBus));

	logger.info('Bootstrap', 'Registered IPC modules');
}
