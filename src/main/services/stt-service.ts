import { Inject, Service } from 'typedi';
import {
	DEFAULT_PROVIDERS,
	PROVIDER_API_CONFIGURATIONS,
	type Provider,
} from '../../shared/providers';
import {
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	SPEECH_TO_TEXT_PROVIDER_IDS,
	getSpeechToTextModelApiTypes,
	supportsSpeechToTextModelApiType,
	type SpeechToTextProviderId,
} from '../../shared/providers/models/stt';
import {
	normalizeSttTranscriptionRequest,
	type SttTranscriptionRequest,
	type SttTranscriptionResult,
} from '../../shared/stt/transcription';
import { normalizeProviderId } from '../../shared/providers/models/types';
import { SttAdapterFactory } from '../stt';
import { SttProviderAuthError, SttProviderUnsupportedError } from '../stt/errors';
import type { SttProviderSpec } from '../stt/types';
import { ProviderStoreService } from './provider-store';

@Service()
export class SttService {
	@Inject(() => ProviderStoreService)
	private readonly providerStore!: ProviderStoreService;

	private readonly adapterFactory: SttAdapterFactory;
	private readonly providerStoreOverride?: ProviderStoreService;

	constructor(adapterFactory = new SttAdapterFactory(), providerStoreOverride?: ProviderStoreService) {
		this.adapterFactory = adapterFactory;
		this.providerStoreOverride = providerStoreOverride;
	}

	async transcribe(request: SttTranscriptionRequest): Promise<SttTranscriptionResult> {
		const normalized = normalizeSttTranscriptionRequest(request);
		const providerId = this.resolveProviderId(normalized.providerId);
		const modelId = this.resolveModelId(providerId, normalized.modelId);
		const provider = this.resolveProvider(providerId);
		const adapter = this.adapterFactory.build(provider);

		return adapter.transcribe({
			...normalized,
			providerId,
			modelId,
		});
	}

	private resolveProviderId(providerId: string | undefined): SpeechToTextProviderId {
		const normalized = normalizeProviderId(providerId ?? OPENAI_SPEECH_TO_TEXT_PROVIDER_ID);
		if ((SPEECH_TO_TEXT_PROVIDER_IDS as readonly string[]).includes(normalized)) {
			return normalized as SpeechToTextProviderId;
		}
		throw new SttProviderUnsupportedError(`Speech-to-text provider is not supported: ${normalized}`);
	}

	private resolveModelId(providerId: SpeechToTextProviderId, modelId: string | undefined): string {
		if (modelId) {
			if (!supportsSpeechToTextModelApiType(providerId, modelId, SPEECH_TO_TEXT_BATCH_API_TYPE)) {
				throw new SttProviderUnsupportedError(
					`Speech-to-text model does not support batch transcription: ${providerId}/${modelId}`
				);
			}
			return modelId;
		}

		const model = SPEECH_TO_TEXT_MODELS_BY_PROVIDER[providerId].find((candidate) =>
			getSpeechToTextModelApiTypes(providerId, candidate.id).includes(
				SPEECH_TO_TEXT_BATCH_API_TYPE
			)
		);
		if (!model) {
			throw new SttProviderUnsupportedError(
				`Speech-to-text provider has no batch transcription model: ${providerId}`
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
}

function defaultProvider(providerId: string): Provider | undefined {
	return DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
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
