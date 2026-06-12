import { randomUUID } from 'node:crypto';
import { Inject, Service } from 'typedi';
import {
	DEFAULT_PROVIDERS,
	PROVIDER_API_CONFIGURATIONS,
	type Provider,
	type PublicProvider,
} from '../../shared/providers';
import type { Provider as CatalogProvider } from '../../shared/providers/definitions';
import {
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	SPEECH_TO_TEXT_PROVIDER_IDS,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
	getSpeechToTextModelApiTypes,
	supportsSpeechToTextModelApiType,
	type SpeechToTextProviderId,
} from '../../shared/providers/models/stt';
import {
	STT_DEFAULT_REALTIME_SAMPLE_RATE,
	normalizeSttRealtimeAudioChunk,
	normalizeSttRealtimeStartRequest,
	normalizeSttTranscriptionRequest,
	type SttRealtimeEvent,
	type SttRealtimeSession,
	type SttRealtimeStartRequest,
	type SttModelSelection,
	type SttTranscriptionRequest,
	type SttTranscriptionResult,
} from '../../shared/stt/transcription';
import {
	cloneModels,
	normalizeProviderId,
	type ProviderModel,
} from '../../shared/providers/models/types';
import { SttAdapterFactory } from '../stt';
import { SttProviderAuthError, SttProviderUnsupportedError } from '../stt/errors';
import { SttSettingsStore } from '../stt/settings';
import type { SttActiveRealtimeSession, SttProviderSpec } from '../stt/types';
import { ProviderStoreService } from './provider-store';

@Service()
export class SttService {
	@Inject(() => ProviderStoreService)
	private readonly providerStore!: ProviderStoreService;

	@Inject(() => SttSettingsStore)
	private readonly settingsStore?: SttSettingsStore;

	private readonly adapterFactory: SttAdapterFactory;
	private readonly providerStoreOverride?: ProviderStoreService;
	private readonly settingsStoreOverride?: SttSettingsStore;
	private readonly realtimeSessions = new Map<string, SttActiveRealtimeSession>();

	constructor(
		adapterFactory = new SttAdapterFactory(),
		providerStoreOverride?: ProviderStoreService,
		settingsStoreOverride?: SttSettingsStore
	) {
		this.adapterFactory = adapterFactory;
		this.providerStoreOverride = providerStoreOverride;
		this.settingsStoreOverride = settingsStoreOverride;
	}

	getSelection(): SttModelSelection | undefined {
		const settings = this.getSettingsStore();
		const configuredProviderId = settings?.getProviderId();
		const configuredModelId = settings?.getModelId();
		if (!configuredProviderId || !configuredModelId) return undefined;

		try {
			const providerId = this.resolveProviderId(configuredProviderId);
			const model = findSpeechToTextModel(providerId, configuredModelId);
			const provider = publicProvider(providerId);
			if (!provider || !model) return undefined;
			return { provider, model: { ...model } };
		} catch {
			return undefined;
		}
	}

	listProviders(): PublicProvider[] {
		return SPEECH_TO_TEXT_PROVIDER_IDS.flatMap((providerId) => {
			const provider = publicProvider(providerId);
			return provider ? [provider] : [];
		});
	}

	listModels(providerId: string): ProviderModel[] {
		const normalized = this.resolveProviderId(providerId);
		return cloneModels(SPEECH_TO_TEXT_MODELS_BY_PROVIDER[normalized]);
	}

	saveSelection(providerId: string, modelId: string): boolean {
		const normalizedProviderId = this.resolveProviderId(providerId);
		const normalizedModelId = modelId.trim();
		if (!findSpeechToTextModel(normalizedProviderId, normalizedModelId)) {
			throw new SttProviderUnsupportedError(
				`Speech-to-text model is not supported: ${normalizedProviderId}/${normalizedModelId}`
			);
		}
		this.requireSettingsStore().setSelection(normalizedProviderId, normalizedModelId);
		return true;
	}

	async transcribe(request: SttTranscriptionRequest): Promise<SttTranscriptionResult> {
		const normalized = normalizeSttTranscriptionRequest(request);
		const providerId = this.resolveProviderId(
			normalized.providerId ?? this.getConfiguredProviderId()
		);
		const modelId = this.resolveModelId(
			providerId,
			normalized.modelId ?? this.getConfiguredModelId(providerId),
			SPEECH_TO_TEXT_BATCH_API_TYPE
		);
		const provider = this.resolveProvider(providerId);
		const adapter = this.adapterFactory.build(provider);

		return adapter.transcribe({
			...normalized,
			providerId,
			modelId,
		});
	}

	async startRealtime(
		request: SttRealtimeStartRequest | undefined,
		onEvent: (event: SttRealtimeEvent) => void
	): Promise<SttRealtimeSession> {
		const normalized = normalizeSttRealtimeStartRequest(request);
		const providerId = this.resolveProviderId(
			normalized.providerId ?? this.getConfiguredProviderId()
		);
		const modelId = this.resolveModelId(
			providerId,
			normalized.modelId ?? this.getConfiguredModelId(providerId),
			SPEECH_TO_TEXT_STREAM_API_TYPE
		);
		const provider = this.resolveProvider(providerId);
		const adapter = this.adapterFactory.build(provider);
		if (!adapter.startRealtime) {
			throw new SttProviderUnsupportedError(
				`Speech-to-text provider does not support realtime transcription: ${providerId}`
			);
		}

		const session: SttRealtimeSession = {
			id: randomUUID(),
			providerId,
			providerName: provider.name,
			modelId,
			sampleRate: normalized.sampleRate ?? realtimeSampleRate(providerId),
			format: 'pcm16',
		};
		const emit = (event: SttRealtimeEvent): void => {
			if (event.type === 'closed') this.realtimeSessions.delete(event.sessionId);
			onEvent(event);
		};
		const connection = await adapter.startRealtime(
			{
				...normalized,
				sessionId: session.id,
				providerId,
				providerName: provider.name,
				modelId,
				sampleRate: session.sampleRate,
			},
			emit
		);
		this.realtimeSessions.set(session.id, { info: session, connection });
		emit({
			type: 'started',
			sessionId: session.id,
			providerId,
			model: modelId,
		});
		return session;
	}

	async appendRealtimeAudio(sessionId: string, audio: string): Promise<void> {
		const session = this.resolveRealtimeSession(sessionId);
		await session.connection.appendAudio(normalizeSttRealtimeAudioChunk(audio));
	}

	async finishRealtime(sessionId: string): Promise<void> {
		const session = this.resolveRealtimeSession(sessionId);
		await session.connection.finish();
	}

	async cancelRealtime(sessionId: string): Promise<void> {
		const session = this.resolveRealtimeSession(sessionId);
		this.realtimeSessions.delete(sessionId);
		await session.connection.cancel();
	}

	private resolveProviderId(providerId: string | undefined): SpeechToTextProviderId {
		const normalized = normalizeProviderId(providerId ?? OPENAI_SPEECH_TO_TEXT_PROVIDER_ID);
		if ((SPEECH_TO_TEXT_PROVIDER_IDS as readonly string[]).includes(normalized)) {
			return normalized as SpeechToTextProviderId;
		}
		throw new SttProviderUnsupportedError(`Speech-to-text provider is not supported: ${normalized}`);
	}

	private resolveModelId(
		providerId: SpeechToTextProviderId,
		modelId: string | undefined,
		apiType: typeof SPEECH_TO_TEXT_BATCH_API_TYPE | typeof SPEECH_TO_TEXT_STREAM_API_TYPE
	): string {
		if (modelId) {
			if (!supportsSpeechToTextModelApiType(providerId, modelId, apiType)) {
				throw new SttProviderUnsupportedError(
					`Speech-to-text model does not support ${apiType} transcription: ${providerId}/${modelId}`
				);
			}
			return modelId;
		}

		const model = SPEECH_TO_TEXT_MODELS_BY_PROVIDER[providerId].find((candidate) =>
			getSpeechToTextModelApiTypes(providerId, candidate.id).includes(apiType)
		);
		if (!model) {
			throw new SttProviderUnsupportedError(
				`Speech-to-text provider has no ${apiType} transcription model: ${providerId}`
			);
		}
		return model.id;
	}

	private resolveProvider(providerId: SpeechToTextProviderId): SttProviderSpec {
		const store = this.providerStoreOverride ?? this.providerStore;
		const stored = store.get(providerId);
		const defaults = defaultProvider(providerId);
		const apiKey = stored?.apiKey.trim() || envApiKey(providerId);
		if (!apiKey) {
			throw new SttProviderAuthError(`${defaults?.name ?? providerId} API key not configured.`);
		}

		return {
			id: providerId,
			name: stored?.name || defaults?.name || providerId,
			apiKey,
			baseURL: stored?.baseUrl || defaults?.baseUrl,
		};
	}

	private resolveRealtimeSession(sessionId: string): SttActiveRealtimeSession {
		const normalized = sessionId.trim();
		const session = this.realtimeSessions.get(normalized);
		if (!session) throw new Error(`Unknown speech-to-text realtime session: ${normalized}`);
		return session;
	}

	private getConfiguredProviderId(): string | undefined {
		return this.getSettingsStore()?.getProviderId();
	}

	private getConfiguredModelId(providerId: SpeechToTextProviderId): string | undefined {
		const settings = this.getSettingsStore();
		const configuredProviderId = settings?.getProviderId();
		if (!configuredProviderId || this.resolveProviderId(configuredProviderId) !== providerId) {
			return undefined;
		}
		return settings?.getModelId();
	}

	private getSettingsStore(): SttSettingsStore | undefined {
		return this.settingsStoreOverride ?? this.settingsStore;
	}

	private requireSettingsStore(): SttSettingsStore {
		const settings = this.getSettingsStore();
		if (!settings) throw new Error('Speech-to-text settings store is unavailable.');
		return settings;
	}
}

function defaultProvider(providerId: string): CatalogProvider | undefined {
	return DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
}

function publicProvider(providerId: string): PublicProvider | undefined {
	const provider = defaultProvider(providerId);
	if (!provider) return undefined;
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl,
		...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
		...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
	};
}

function findSpeechToTextModel(
	providerId: SpeechToTextProviderId,
	modelId: string
): ProviderModel | undefined {
	const normalizedModelId = modelId.trim();
	return SPEECH_TO_TEXT_MODELS_BY_PROVIDER[providerId].find(
		(model) => model.id === normalizedModelId
	);
}

function envApiKey(providerId: string): string {
	const config =
		PROVIDER_API_CONFIGURATIONS[providerId as keyof typeof PROVIDER_API_CONFIGURATIONS];
	for (const envVar of config?.recommendedEnvVars ?? []) {
		const value = process.env[envVar]?.trim();
		if (value) return value;
	}
	return '';
}

function realtimeSampleRate(providerId: string): number {
	if (providerId === 'mistral') return 16_000;
	return STT_DEFAULT_REALTIME_SAMPLE_RATE;
}
