import { normalizeProviderId } from '../../shared/provider_types';
import type { Agent } from '../agent/agent';
import { builtinTools } from '../agent/runner/run_builtin_tools';
import { buildSystemPrompt } from '../agent/system';
import type { EventBus } from '../event_bus';
import { defaultProviderId, loadModels } from '../models';
import { getModelId, getOptions, getProviderId } from '../models/models_store';
import { getProvider } from '../settings_store';
import type { WindowFactory } from '../window_factory';
import { realtimeVoiceConversationFactory } from './conversation';
import { RealtimeVoiceManager } from './manager';
import { OpenAIRealtimeVoiceAdapter } from './openai';
import { REALTIME_VOICE_MODELS, type RealtimeVoiceModel } from './types';
import { RealtimeVoiceChannels } from '../../shared/ipc_channels_definitions';

export function createRealtimeVoiceManager(
	agent: Agent,
	windowFactory: WindowFactory,
	eventBus: EventBus
): RealtimeVoiceManager {
	const manager = new RealtimeVoiceManager({
		adapter: new OpenAIRealtimeVoiceAdapter(),
		resources: agent.resources,
		createConversation: realtimeVoiceConversationFactory(agent.config),
		emit: (windowId, event) => eventBus.sendTo(windowId, RealtimeVoiceChannels.sessionEvent, event),
		resolveConfiguration: async () => {
			const configuredProviderId = getProviderId('realtimeVoice');
			const providerId = normalizeProviderId(
				configuredProviderId ?? defaultProviderId('realtime-voice') ?? ''
			);
			if (providerId !== 'openai') {
				throw new Error('Native realtime voice currently supports only OpenAI.');
			}
			const provider = getProvider(providerId);
			const apiKey = provider?.apiKey.trim() ?? '';
			if (!apiKey) throw new Error('OpenAI API key is required for realtime voice.');

			const models = loadModels().filter(
				(model) =>
					model.provider.id === providerId &&
					model.type === 'realtime-voice' &&
					REALTIME_VOICE_MODELS.includes(model.id as RealtimeVoiceModel)
			);
			const configuredModelId = getModelId('realtimeVoice');
			const model = configuredModelId
				? models.find((candidate) => candidate.id === configuredModelId)
				: models.find((candidate) => candidate.default) ?? models[0];
			if (!model) throw new Error('Configured OpenAI realtime voice model is not supported.');

			const configuredVoice = getOptions('realtimeVoice').voice;
			const metadataVoice = model.metadata?.inputs.voice?.default;
			const supportedVoices = (model.metadata?.inputs.voice?.enum ?? []).filter(
				(value): value is string => typeof value === 'string'
			);
			const voice =
				typeof configuredVoice === 'string' &&
				configuredVoice.trim() &&
				supportedVoices.includes(configuredVoice.trim())
					? configuredVoice.trim()
					: typeof metadataVoice === 'string' &&
						metadataVoice.trim() &&
						supportedVoices.includes(metadataVoice.trim())
						? metadataVoice.trim()
						: 'marin';
			const tools = builtinTools(agent.config, agent.sandbox, windowFactory);
			const instructions = await buildSystemPrompt(agent.config, tools);
			return {
				providerId,
				apiKey,
				model: model.id as RealtimeVoiceModel,
				voice,
				instructions,
				tools,
			};
		},
	});
	eventBus.on('window:closed', (event) => {
		void manager.stopWindow((event.payload as { windowId: number }).windowId);
	});
	return manager;
}
