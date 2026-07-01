import type { ContainerInstance } from 'typedi';
import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { ProviderStoreIpc } from '../provider';
import { SttIpc } from '../stt';
import { WindowIpc } from '../window';
import type { EventBus } from '../../app';
import { AppPermissionsService } from '../../app';
import { LoggerService } from '../../shared';
import { Agent } from '../../agent/agent';
import { ChannelRegistry } from '../../channels';
import { ProviderService } from '../../providers';
import { SttService } from '../../stt/service';
import { Cron } from '../../agent/cron/cron';
import { Skills } from '../../agent/skills/skills';

export interface RegisterIpcHandlersServices {
	cron: Cron;
	skills: Skills;
}

export function registerIpcHandlers(
	container: ContainerInstance,
	eventBus: EventBus,
	services: RegisterIpcHandlersServices
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
			{ logger, appPermissions: container.get(AppPermissionsService) },
			eventBus
		)
	);
	safeRegister('agent', () =>
		new AgentIpc().register(
			{
				logger,
				agent: container.get(Agent),
				cron: services.cron,
				skills: services.skills,
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
	safeRegister('provider-store', () =>
		new ProviderStoreIpc().register({ providerStore: container.get(ProviderService) }, eventBus)
	);
	safeRegister('stt', () => new SttIpc().register({ stt: container.get(SttService) }, eventBus));
	safeRegister('window', () => new WindowIpc().register({ logger }, eventBus));

	logger.info('Bootstrap', 'Registered IPC modules');
}
