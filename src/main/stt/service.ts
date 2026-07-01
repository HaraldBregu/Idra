import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import { Service } from 'typedi';
import { DEFAULT_PROVIDERS, type PublicProvider } from '../../shared/providers';
import {
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
	SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES,
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
import { SttAdapterFactory } from './factory';
import { SttProviderAuthError, SttProviderUnsupportedError } from './errors';
import type { SttActiveRealtimeSession, SttProviderSpec } from './types';
import { PROVIDER_SERVICE, type ProviderService } from '../providers';

interface SttSettingsSchema {
	providerId: string | undefined;
	modelId: string | undefined;
}

type SttSettingsStorage = Pick<Store<SttSettingsSchema>, 'get' | 'set'>;

const DEFAULT_SETTINGS: SttSettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

const STT_SETTINGS_STORE_NAME = 'settings';
const STT_SETTINGS_STORE_DIRECTORY = 'stt';

export interface SttServiceOptions {
	cwd?: string;
	providerStore?: Pick<ProviderService, 'get'>;
	store?: SttSettingsStorage;
}

@Service()
export class SttService {
	@Inject(PROVIDER_SERVICE)
	private readonly providerStore!: ProviderService;

	private readonly adapterFactory: SttAdapterFactory;
	private readonly providerStoreOverride?: Pick<ProviderService, 'get'>;
	private readonly store: SttSettingsStorage;
	private readonly realtimeSessions = new Map<string, SttActiveRealtimeSession>();

	constructor();
	constructor(adapterFactory: SttAdapterFactory, options?: SttServiceOptions);
	constructor(adapterFactory: unknown = new SttAdapterFactory(), options: SttServiceOptions = {}) {
		this.adapterFactory = isSttAdapterFactory(adapterFactory)
			? adapterFactory
			: new SttAdapterFactory();
		this.providerStoreOverride = options.providerStore;
		this.store =
			options.store ??
			new Store<SttSettingsSchema>({
				name: STT_SETTINGS_STORE_NAME,
				cwd: options.cwd ?? STT_SETTINGS_STORE_DIRECTORY,
				accessPropertiesByDotNotation: false,
				defaults: DEFAULT_SETTINGS,
			});
	}

	getSelection(): SttModelSelection | undefined {
		const configuredProviderId = this.getProviderId();
		const configuredModelId = this.getModelId();
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
		this.setSelection(normalizedProviderId, normalizedModelId);
		return true;
	}

	async transcribe(request: SttTranscriptionRequest): Promise<SttTranscriptionResult> {
		const normalized = normalizeSttTranscriptionRequest(request);
		const providerId = this.resolveProviderId(
			normalized.providerId ?? this.getConfiguredProviderId()
		);
		const modelId = this.resolveModelId(
			providerId,
			normalized.modelId ?? this.getConfiguredModelId(providerId, SPEECH_TO_TEXT_BATCH_API_TYPE),
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
			normalized.modelId ?? this.getConfiguredModelId(providerId, SPEECH_TO_TEXT_STREAM_API_TYPE),
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
		throw new SttProviderUnsupportedError(
			`Speech-to-text provider is not supported: ${normalized}`
		);
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
		const provider = this.getProviderSpecFromProviderStore(providerId);
		if (!provider.apiKey) {
			throw new SttProviderAuthError(`${provider.name} API key not configured.`);
		}
		return provider;
	}

	private resolveRealtimeSession(sessionId: string): SttActiveRealtimeSession {
		const normalized = sessionId.trim();
		const session = this.realtimeSessions.get(normalized);
		if (!session) throw new Error(`Unknown speech-to-text realtime session: ${normalized}`);
		return session;
	}

	private getConfiguredProviderId(): SpeechToTextProviderId | undefined {
		const providerId = this.getProviderId();
		if (!providerId) return undefined;
		try {
			return this.resolveProviderId(providerId);
		} catch {
			return undefined;
		}
	}

	private getConfiguredModelId(
		providerId: SpeechToTextProviderId,
		apiType: typeof SPEECH_TO_TEXT_BATCH_API_TYPE | typeof SPEECH_TO_TEXT_STREAM_API_TYPE
	): string | undefined {
		const configuredProviderId = this.getConfiguredProviderId();
		if (!configuredProviderId || configuredProviderId !== providerId) return undefined;
		const modelId = this.getModelId();
		return modelId && supportsSpeechToTextModelApiType(providerId, modelId, apiType)
			? modelId
			: undefined;
	}

	private getProviderId(): string | undefined {
		return optionalTrimmedString(this.store.get('providerId'));
	}

	private getModelId(): string | undefined {
		return optionalTrimmedString(this.store.get('modelId'));
	}

	private setSelection(providerId: string, modelId: string): void {
		this.store.set('providerId', providerId);
		this.store.set('modelId', modelId);
	}

	private getProviderSpecFromProviderStore(providerId: SpeechToTextProviderId): SttProviderSpec {
		const stored = this.getProviderStore().get(providerId);
		const defaults = defaultProvider(providerId);
		return {
			id: providerId,
			name: stored?.name || defaults?.name || providerId,
			apiKey: stored?.apiKey.trim() ?? '',
			baseURL: stored?.baseUrl || SPEECH_TO_TEXT_PROVIDER_BASE_URLS[providerId],
		};
	}

	private getProviderStore(): Pick<ProviderService, 'get'> {
		return this.providerStoreOverride ?? this.providerStore;
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

function realtimeSampleRate(providerId: SpeechToTextProviderId): number {
	return SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES[providerId] ?? STT_DEFAULT_REALTIME_SAMPLE_RATE;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isSttAdapterFactory(value: unknown): value is SttAdapterFactory {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { build?: unknown }).build === 'function'
	);
}
