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
import { AgentsStore } from './agents';
import { AssistantStore } from './assistant';
import { ChannelsStore } from './channels';
import { ConnectorsStore } from './connectors';
import { CronStore } from './cron';
import { HeartbeatStore } from './heartbeat';
import { ImageCreatorStore } from './image-creator';
import { PolicyStore } from './policy';
import { ProvidersStore } from './providers';
import { SpeechToTextStore } from './speech-to-text';
import { TaskStore } from './task';
import { TextToSoundStore } from './text-to-sound';
import { TextToSpeechStore } from './text-to-speech';
import { TextToVideoStore } from './text-to-video';

export class StoreService {
	private store: SettingsStoreAccessor;
	private providers: ProvidersStore;
	private assistant: AssistantStore;
	private speechToText: SpeechToTextStore;
	private textToSpeech: TextToSpeechStore;
	private imageCreator: ImageCreatorStore;
	private textToVideo: TextToVideoStore;
	private textToSound: TextToSoundStore;
	private agents: AgentsStore;
	private task: TaskStore;
	private channels: ChannelsStore;
	private policy: PolicyStore;
	private cron: CronStore;
	private heartbeat: HeartbeatStore;
	private connectors: ConnectorsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStoreAccessor;
		this.providers = new ProvidersStore(this.store);
		this.assistant = new AssistantStore(this.store, this.providers);
		this.speechToText = new SpeechToTextStore(this.store, this.providers);
		this.textToSpeech = new TextToSpeechStore(this.store, this.providers);
		this.imageCreator = new ImageCreatorStore(this.store, this.providers);
		this.textToVideo = new TextToVideoStore(this.store, this.providers);
		this.textToSound = new TextToSoundStore(this.store, this.providers);
		this.agents = new AgentsStore(this.store);
		this.task = new TaskStore(this.store);
		this.channels = new ChannelsStore(this.store);
		this.policy = new PolicyStore(this.store);
		this.cron = new CronStore(this.store);
		this.heartbeat = new HeartbeatStore(this.store);
		this.connectors = new ConnectorsStore(this.store);
	}

	// Providers
	getProviderById(id: string): Provider | undefined {
		return this.providers.getProviderById(id);
	}
	getProviders(): Provider[] {
		return this.providers.getProviders();
	}
	addProvider(input: Provider): Provider {
		return this.providers.addProvider(input);
	}
	upsertProvider(input: Provider): void {
		return this.providers.upsertProvider(input);
	}
	setOpenAiApiKey(key: string): void {
		return this.providers.setOpenAiApiKey(key);
	}
	setAnthropicApiKey(key: string): void {
		return this.providers.setAnthropicApiKey(key);
	}

	// Models / Operators
	getOperator(): OperatorStoreState | undefined {
		const next: OperatorStoreState = {};
		const assistant = this.getAssistantOperator();
		if (assistant) next.assistant = assistant;
		const speechToText = this.getSpeechToTextOperator();
		if (speechToText) next.speechToText = speechToText;
		const textToSpeech = this.getTextToSpeechOperator();
		if (textToSpeech) next.textToSpeech = textToSpeech;
		const imageCreator = this.getImageCreatorOperator();
		if (imageCreator) next.imageCreator = imageCreator;
		const textToVideo = this.getTextToVideoOperator();
		if (textToVideo) next.videoCreator = textToVideo;
		const textToSound = this.getTextToSoundOperator();
		if (textToSound) next.musicCreator = textToSound;
		const agents = this.assistant.getAgentsHeartbeatConfig();
		if (agents) next.agents = agents;
		return Object.keys(next).length > 0 ? next : undefined;
	}
	getService(): OperatorStoreState | undefined {
		return this.getOperator();
	}
	setDefaultHeartbeatConfig(config: AgentHeartbeatConfig): AgentHeartbeatConfig {
		return this.assistant.setDefaultHeartbeatConfig(config);
	}
	getAssistantOperator(): ConfiguredModelOperator | undefined {
		return this.assistant.getAssistantOperator();
	}
	getAssistantModel(): Model | undefined {
		return this.assistant.getAssistantModel();
	}
	getAssistantProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.assistant.getAssistantProvider();
	}
	getSpeechToTextOperator(): ConfiguredModelOperator | undefined {
		return this.speechToText.getSpeechToTextOperator();
	}
	getTextToSpeechOperator(): ConfiguredModelOperator | undefined {
		return this.textToSpeech.getTextToSpeechOperator();
	}
	getImageCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.imageCreator.getImageCreatorOperator();
	}
	getTextToVideoOperator(): ConfiguredModelOperator | undefined {
		return this.textToVideo.getTextToVideoOperator();
	}
	getTextToSoundOperator(): ConfiguredModelOperator | undefined {
		return this.textToSound.getTextToSoundOperator();
	}
	getMusicCreatorOperator(): ConfiguredModelOperator | undefined {
		return this.getTextToSoundOperator();
	}
	getImageCreatorSettings(): ModelModuleSettings | undefined {
		return this.imageCreator.getImageCreatorSettings();
	}
	getAgentRuntimePreference(): string | undefined {
		return this.assistant.getAgentRuntimePreference();
	}
	setAgentRuntimePreference(agentRuntime?: string): boolean {
		return this.assistant.setAgentRuntimePreference(agentRuntime);
	}
	setAssistantOperator(providerId: string, model: Model): boolean {
		return this.assistant.setAssistantOperator(providerId, model);
	}
	setSpeechToTextOperator(providerId: string, model: Model): boolean {
		return this.speechToText.setSpeechToTextOperator(providerId, model);
	}
	setTextToSpeechOperator(providerId: string, model: Model): boolean {
		return this.textToSpeech.setTextToSpeechOperator(providerId, model);
	}
	setImageCreatorOperator(providerId: string, model: Model): boolean {
		return this.imageCreator.setImageCreatorOperator(providerId, model);
	}
	setTextToVideoOperator(providerId: string, model: Model): boolean {
		return this.textToVideo.setTextToVideoOperator(providerId, model);
	}
	setTextToSoundOperator(providerId: string, model: Model): boolean {
		return this.textToSound.setTextToSoundOperator(providerId, model);
	}
	setMusicCreatorOperator(providerId: string, model: Model): boolean {
		return this.setTextToSoundOperator(providerId, model);
	}
	getAgentModel(): Model | undefined {
		return this.assistant.getAgentModel();
	}
	getAgentProvider(): Omit<Provider, 'apiKey'> | undefined {
		return this.assistant.getAgentProvider();
	}
	getAgentService(): ModelOperatorSelection | undefined {
		return this.assistant.getAgentService();
	}
	getSpeechTranscriberService(): ModelOperatorSelection | undefined {
		return this.speechToText.getSpeechTranscriberService();
	}
	setAgentService(providerId: string, model: Model): boolean {
		return this.assistant.setAgentService(providerId, model);
	}
	setSpeechTranscriberService(providerId: string, model: Model): boolean {
		return this.speechToText.setSpeechTranscriberService(providerId, model);
	}

	// Agents
	getKeepAwakeEnabled(): boolean {
		return this.agents.getKeepAwakeEnabled();
	}
	setKeepAwakeEnabled(enabled: boolean) {
		return this.agents.setKeepAwakeEnabled(enabled);
	}
	getAgentRoutingSettings(): AgentRoutingSettings {
		return this.agents.getAgentRoutingSettings();
	}
	getConfiguredAgents(): AgentConfig[] {
		return this.agents.getConfiguredAgents();
	}
	getAgentConfig(id: string): AgentConfig | undefined {
		return this.agents.getAgentConfig(id);
	}
	setAgentRoutingSettings(settings: unknown): AgentRoutingSettings {
		return this.agents.setAgentRoutingSettings(settings);
	}
	getTaskSettings(): TaskSettings {
		return this.task.getTaskSettings();
	}

	// Channels
	getChannel(): Channel {
		return this.channels.getChannel();
	}
	getTelegramChannel(): TelegramChannelProperties {
		return this.channels.getTelegramChannel();
	}
	getChannelConfig<TKey extends ChannelType>(type: TKey): Channel[TKey] {
		return this.channels.getChannelConfig(type);
	}
	setChannelProperties<TKey extends ChannelType>(
		type: TKey,
		properties: Partial<Channel[TKey]>
	): Channel {
		return this.channels.setChannelProperties(type, properties);
	}
	setChannelConfig<TKey extends ChannelType>(type: TKey, config: Channel[TKey]): Channel[TKey] {
		return this.channels.setChannelConfig(type, config);
	}
	setTelegramChannel(config: TelegramChannelProperties): TelegramChannelProperties {
		return this.channels.setTelegramChannel(config);
	}

	// Policy
	getPolicy(): PolicyConfig {
		return this.policy.getPolicy();
	}
	setPolicy(policy: PolicyConfig): PolicyConfig {
		return this.policy.setPolicy(policy);
	}

	// Cron
	getCronTasks(): CronTask[] {
		return this.cron.getCronTasks();
	}
	setCronTasks(tasks: CronTask[]): void {
		return this.cron.setCronTasks(tasks);
	}
	getCronSchedulerState(): CronStoreState {
		return this.cron.getCronSchedulerState();
	}
	setCronSchedulerState(state: CronStoreState): void {
		return this.cron.setCronSchedulerState(state);
	}
	getFridayCronState(): FridayCronStoreState {
		return this.cron.getFridayCronState();
	}
	setFridayCronState(state: FridayCronStoreState): void {
		return this.cron.setFridayCronState(state);
	}

	// Heartbeat
	getHeartbeatState(): HeartbeatStoreState {
		return this.heartbeat.getHeartbeatState();
	}
	setHeartbeatState(state: HeartbeatStoreState): void {
		return this.heartbeat.setHeartbeatState(state);
	}

	// Connectors
	getConnectors(): ConnectorConfig[] {
		return this.connectors.getConnectors();
	}
	getConnectorById(id: string): ConnectorConfig | undefined {
		return this.connectors.getConnectorById(id);
	}
	setConnectors(connectors: ConnectorConfig[]): void {
		return this.connectors.setConnectors(connectors);
	}
}
