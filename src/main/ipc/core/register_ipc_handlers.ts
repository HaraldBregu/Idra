import { AgentIpc } from '../agent';
import { AppIpc } from '../app';
import { RecorderIpc } from '../recorder';
import { ChannelsIpc } from '../channels';
import { CronIpc } from '../cron';
import { McpIpc } from '../mcp';
import { ModelsIpc } from '../models';
import { SkillsIpc } from '../skills';
import { ProviderStoreIpc } from '../provider';
import { SearchIpc } from '../search';
import { StorageIpc } from '../storage';
import { DatabaseIpc } from '../database';
import { ExtensionsIpc } from '../extensions';
import { WikiIpc } from '../wiki';
import { WindowIpc } from '../window';
import type { EventBus } from '../../app';
import type { MainServices } from '../../bootstrap';

export function registerIpcHandlers(services: MainServices, eventBus: EventBus): void {
	const { logger, agentService, channelRegistry, windowFactory } = services;

	const safeRegister = (name: string, register: () => void): void => {
		try {
			register();
		} catch (error) {
			logger.error('Bootstrap', `Failed to register IPC module: ${name}`, error);
		}
	};

	safeRegister('app', () => new AppIpc().register({ logger }, eventBus));
	safeRegister('agent', () => new AgentIpc().register({ logger, agent: agentService }, eventBus));
	safeRegister('recorder', () => new RecorderIpc().register(undefined, eventBus));
	safeRegister('channels', () => new ChannelsIpc().register({ logger, channelRegistry }, eventBus));
	safeRegister('cron', () => new CronIpc().register(undefined, eventBus));
	safeRegister('mcp', () => new McpIpc().register(undefined, eventBus));
	safeRegister('models', () => new ModelsIpc().register(undefined, eventBus));
	safeRegister('skills', () => new SkillsIpc().register(undefined, eventBus));
	safeRegister('provider-store', () => new ProviderStoreIpc().register(undefined, eventBus));
	safeRegister('search', () => new SearchIpc().register(undefined, eventBus));
	safeRegister('storage', () => new StorageIpc().register(undefined, eventBus));
	safeRegister('database', () => new DatabaseIpc().register(undefined, eventBus));
	safeRegister('extensions', () => new ExtensionsIpc().register({ windowFactory }, eventBus));
	safeRegister('wiki', () => new WikiIpc().register(undefined, eventBus));
	safeRegister('window', () => new WindowIpc().register({ logger }, eventBus));

	logger.info('Bootstrap', 'Registered IPC modules');
}
