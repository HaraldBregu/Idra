import type { ContainerInstance } from 'typedi';
import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { ChannelsIpc } from '../channels';
import { ConnectorsIpc } from '../connectors';
import { HeartbeatIpc } from '../heartbeat';
import { ProviderStoreIpc } from '../provider';
import { SkillsIpc } from '../skills';
import { SttIpc } from '../stt';
import { TasksIpc } from '../tasks';
import { WindowIpc } from '../window';
import type { EventBus } from '../../app';
import { AppPermissionsService } from '../../app';
import { LoggerService } from '../../shared';
import { AgentService } from '../../agent/main/main';
import { Store } from '../../agent/core/store';
import { Config } from '../../agent/core/config';
import { ChannelRegistry } from '../../channels';
import { McpService } from '../../mcp';
import { HeartbeatService } from '../../heartbeat';
import { ProviderService } from '../../providers';
import { SttService } from '../../stt/service';
import { CronService } from '../../cron';

export function registerIpcHandlers(container: ContainerInstance, eventBus: EventBus): void {
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
			{ logger, agent: container.get(AgentService), settings: new Store() },
			eventBus
		)
	);
	safeRegister('channels', () =>
		new ChannelsIpc().register(
			{ logger, channelRegistry: container.get(ChannelRegistry) },
			eventBus
		)
	);
	safeRegister('connectors', () =>
		new ConnectorsIpc().register({ connector: container.get(McpService) }, eventBus)
	);
	safeRegister('heartbeat', () =>
		new HeartbeatIpc().register({ heartbeat: container.get(HeartbeatService) }, eventBus)
	);
	safeRegister('provider-store', () =>
		new ProviderStoreIpc().register({ providerStore: container.get(ProviderService) }, eventBus)
	);
	safeRegister('skills', () => new SkillsIpc().register({}, eventBus));
	safeRegister('stt', () => new SttIpc().register({ stt: container.get(SttService) }, eventBus));
	safeRegister('tasks', () =>
		new TasksIpc().register({ cron: container.get(CronService) }, eventBus)
	);
	safeRegister('window', () => new WindowIpc().register({ logger }, eventBus));

	logger.info('Bootstrap', 'Registered IPC modules');
}
