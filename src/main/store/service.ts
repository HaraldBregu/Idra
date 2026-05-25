import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import type {
	ConfiguredModelOperator,
	Model,
	ModelOperatorSelection,
	OperatorStoreState,
} from '../../shared/agents/service';
import type { AgentHeartbeatConfig, HeartbeatStoreState } from '../../shared/heartbeat';
import type { ConnectorConfig } from '../../shared/connector';
import type { Channel, ChannelType, TelegramChannelProperties } from '../../shared/channels';
import type { CronTask } from '../../shared/cron';
import type { CronStoreState } from '../cron/core/cron.types';
import type { FridayCronStoreState } from '../cron/friday/store';
import type { PolicyConfig } from '../../shared/policy';
import type {
	AgentConfig,
	AgentRoutingSettings,
	ModelModuleSettings,
	SettingsStoreAccessor,
	StoreSchema,
	TaskSettings,
} from '../../shared/store';
import { AgentStore } from './agent';
import { ChannelStore } from './channel';
import { ConnectorStore } from './connector';
import { HeartbeatStore } from './heartbeat';
import { ModelStore } from './model';
import { PolicyStore } from './policy';
import { ProviderStore } from './provider';
import { SchedulerStore } from './scheduler';

export class StoreService {
	private store: SettingsStoreAccessor;
	private providers: ProviderStore;
	private models: ModelStore;
	private agents: AgentStore;
	private channels: ChannelStore;
	private policy: PolicyStore;
	private scheduler: SchedulerStore;
	private heartbeat: HeartbeatStore;
	private connectors: ConnectorStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStoreAccessor;
		this.providers = new ProviderStore(this.store);
		this.models = new ModelStore(this.store, this.providers);
		this.agents = new AgentStore(this.store);
		this.channels = new ChannelStore(this.store);
		this.policy = new PolicyStore(this.store);
		this.scheduler = new SchedulerStore(this.store);
		this.heartbeat = new HeartbeatStore(this.store);
		this.connectors = new ConnectorStore(this.store);
	}

	// Providers
	getProviderById(id: string): Provider | undefined { return this.providers.getProviderById(id); }
	getProviders(): Provider[] { return this.providers.getProviders(); }
	addProvider(input: Provider): Provider { return this.providers.addProvider(input); }
	upsertProvider(input: Provider): void { return this.providers.upsertProvider(input); }
	setOpenAiApiKey(key: string): void { return this.providers.setOpenAiApiKey(key); }
	setAnthropicApiKey(key: string): void { return this.providers.setAnthropicApiKey(key); }

	// Models / Operators
	getOperator(): OperatorStoreState | undefined { return this.models.getOperator(); }
	getService(): OperatorStoreState | undefined { return this.models.getService(); }
	setDefaultHeartbeatConfig(config: AgentHeartbeatConfig): AgentHeartbeatConfig { return this.models.setDefaultHeartbeatConfig(config); }
	getAssistantOperator(): ConfiguredModelOperator | undefined { return this.models.getAssistantOperator(); }
	getAssistantModel(): Model | undefined { return this.models.getAssistantModel(); }
	getAssistantProvider(): Omit<Provider, 'apiKey'> | undefined { return this.models.getAssistantProvider(); }
	getSpeechToTextOperator(): ConfiguredModelOperator | undefined { return this.models.getSpeechToTextOperator(); }
	getTextToSpeechOperator(): ConfiguredModelOperator | undefined { return this.models.getTextToSpeechOperator(); }
	getImageCreatorOperator(): ConfiguredModelOperator | undefined { return this.models.getImageCreatorOperator(); }
	getTextToVideoOperator(): ConfiguredModelOperator | undefined { return this.models.getTextToVideoOperator(); }
	getMusicCreatorOperator(): ConfiguredModelOperator | undefined { return this.models.getMusicCreatorOperator(); }
	getImageCreatorSettings(): ModelModuleSettings | undefined { return this.models.getImageCreatorSettings(); }
	getAgentRuntimePreference(): string | undefined { return this.models.getAgentRuntimePreference(); }
	setAgentRuntimePreference(agentRuntime?: string): boolean { return this.models.setAgentRuntimePreference(agentRuntime); }
	setAssistantOperator(providerId: string, model: Model): boolean { return this.models.setAssistantOperator(providerId, model); }
	setSpeechToTextOperator(providerId: string, model: Model): boolean { return this.models.setSpeechToTextOperator(providerId, model); }
	setTextToSpeechOperator(providerId: string, model: Model): boolean { return this.models.setTextToSpeechOperator(providerId, model); }
	setImageCreatorOperator(providerId: string, model: Model): boolean { return this.models.setImageCreatorOperator(providerId, model); }
	setTextToVideoOperator(providerId: string, model: Model): boolean { return this.models.setTextToVideoOperator(providerId, model); }
	setMusicCreatorOperator(providerId: string, model: Model): boolean { return this.models.setMusicCreatorOperator(providerId, model); }
	getAgentModel(): Model | undefined { return this.models.getAgentModel(); }
	getAgentProvider(): Omit<Provider, 'apiKey'> | undefined { return this.models.getAgentProvider(); }
	getAgentService(): ModelOperatorSelection | undefined { return this.models.getAgentService(); }
	getSpeechTranscriberService(): ModelOperatorSelection | undefined { return this.models.getSpeechTranscriberService(); }
	setAgentService(providerId: string, model: Model): boolean { return this.models.setAgentService(providerId, model); }
	setSpeechTranscriberService(providerId: string, model: Model): boolean { return this.models.setSpeechTranscriberService(providerId, model); }

	// Agents
	getKeepAwakeEnabled(): boolean { return this.agents.getKeepAwakeEnabled(); }
	setKeepAwakeEnabled(enabled: boolean) { return this.agents.setKeepAwakeEnabled(enabled); }
	getAgentRoutingSettings(): AgentRoutingSettings { return this.agents.getAgentRoutingSettings(); }
	getConfiguredAgents(): AgentConfig[] { return this.agents.getConfiguredAgents(); }
	getAgentConfig(id: string): AgentConfig | undefined { return this.agents.getAgentConfig(id); }
	setAgentRoutingSettings(settings: unknown): AgentRoutingSettings { return this.agents.setAgentRoutingSettings(settings); }
	getBackgroundTaskSettings(): TaskSettings { return this.agents.getBackgroundTaskSettings(); }

	// Channels
	getChannel(): Channel { return this.channels.getChannel(); }
	getTelegramChannel(): TelegramChannelProperties { return this.channels.getTelegramChannel(); }
	getChannelConfig<TKey extends ChannelType>(type: TKey): Channel[TKey] { return this.channels.getChannelConfig(type); }
	setChannelProperties<TKey extends ChannelType>(type: TKey, properties: Partial<Channel[TKey]>): Channel { return this.channels.setChannelProperties(type, properties); }
	setChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): Channel[TKey] { return this.channels.setChannelConfig(type, config); }
	setTelegramChannel(config: TelegramChannelProperties): TelegramChannelProperties { return this.channels.setTelegramChannel(config); }

	// Policy
	getPolicy(): PolicyConfig { return this.policy.getPolicy(); }
	setPolicy(policy: PolicyConfig): PolicyConfig { return this.policy.setPolicy(policy); }

	// Scheduler / Cron
	getCronTasks(): CronTask[] { return this.scheduler.getCronTasks(); }
	setCronTasks(tasks: CronTask[]): void { return this.scheduler.setCronTasks(tasks); }
	getCronSchedulerState(): CronStoreState { return this.scheduler.getCronSchedulerState(); }
	setCronSchedulerState(state: CronStoreState): void { return this.scheduler.setCronSchedulerState(state); }
	getFridayCronState(): FridayCronStoreState { return this.scheduler.getFridayCronState(); }
	setFridayCronState(state: FridayCronStoreState): void { return this.scheduler.setFridayCronState(state); }

	// Heartbeat
	getHeartbeatState(): HeartbeatStoreState { return this.heartbeat.getHeartbeatState(); }
	setHeartbeatState(state: HeartbeatStoreState): void { return this.heartbeat.setHeartbeatState(state); }

	// Connectors
	getConnectors(): ConnectorConfig[] { return this.connectors.getConnectors(); }
	getConnectorById(id: string): ConnectorConfig | undefined { return this.connectors.getConnectorById(id); }
	setConnectors(connectors: ConnectorConfig[]): void { return this.connectors.setConnectors(connectors); }
}
