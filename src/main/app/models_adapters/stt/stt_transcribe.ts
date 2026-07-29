import { randomUUID } from 'node:crypto';
import type { PublicProvider } from '../../../../shared';
import {
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
	SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES,
	SPEECH_TO_TEXT_PROVIDER_IDS,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
	getSpeechToTextModelApiTypes,
	supportsSpeechToTextModelApiType,
} from '../../../../shared/provider_models_definitions';
import type { SpeechToTextProviderId } from '../../../../shared/provider_models_types';
import {
	STT_DEFAULT_REALTIME_SAMPLE_RATE,
	normalizeSttRealtimeAudioChunk,
	normalizeSttRealtimeStartRequest,
	normalizeSttTranscriptionRequest,
	type SttRealtimeEvent,
	type SttRealtimeSession,
	type SttRealtimeStartRequest,
	type SttModelSelection,
	type SttSelectionMode,
	type SttTranscriptionRequest,
	type SttTranscriptionResult,
} from '../../../../shared/stt_transcription';
import {
	normalizeProviderId,
} from '../../../../shared/provider_models_definitions';
import type { ProviderModel } from '../../../../shared/provider_models_types';
import { buildSttAdapter } from './stt_factory';
import { SttProviderAuthError, SttProviderUnsupportedError } from './stt_errors';
import type { SttActiveRealtimeSession, SttProviderSpec } from './stt_types';
import { getProvider, loadProviders, providerModels } from '../../../providers';
import type { Provider as CatalogProvider } from '../../../../shared/providers_definitions';
import {
	getModelId as getTranscribeModelId,
	getProviderId as getTranscribeProviderId,
	setSelection as setTranscribeSelection,
} from '../../../models/models_store';

const realtimeSessions = new Map<string, SttActiveRealtimeSession>();

export function getSelection(mode: SttSelectionMode = 'transcribe'): SttModelSelection | undefined {
	const configuredProviderId = getTranscribeProviderId(mode);
	const configuredModelId = getTranscribeModelId(mode);
	if (!configuredProviderId || !configuredModelId) return undefined;

	try {
		const providerId = resolveProviderId(configuredProviderId);
		const model = findSpeechToTextModel(providerId, configuredModelId);
		const provider = publicProvider(providerId);
		if (!provider || !model) return undefined;
		return { provider, model: { ...model } };
	} catch {
		return undefined;
	}
}

export function listProviders(): PublicProvider[] {
	return SPEECH_TO_TEXT_PROVIDER_IDS.flatMap((providerId) => {
		const provider = publicProvider(providerId);
		return provider ? [provider] : [];
	});
}

export function listModels(providerId: string): ProviderModel[] {
	const normalized = resolveProviderId(providerId);
	return providerModels(normalized, 'speech-to-text');
}

export function saveSelection(
	providerId: string,
	modelId: string,
	mode: SttSelectionMode = 'transcribe'
): boolean {
	const normalizedProviderId = resolveProviderId(providerId);
	const normalizedModelId = modelId.trim();
	const apiType =
		mode === 'realtime' ? SPEECH_TO_TEXT_STREAM_API_TYPE : SPEECH_TO_TEXT_BATCH_API_TYPE;
	if (!supportsSpeechToTextModelApiType(normalizedProviderId, normalizedModelId, apiType)) {
		throw new SttProviderUnsupportedError(
			`Speech-to-text model does not support ${apiType} transcription: ${normalizedProviderId}/${normalizedModelId}`
		);
	}
	setTranscribeSelection(mode, normalizedProviderId, normalizedModelId);
	return true;
}

export async function transcribe(request: SttTranscriptionRequest): Promise<SttTranscriptionResult> {
	const normalized = normalizeSttTranscriptionRequest(request);
	const providerId = resolveProviderId(
		normalized.providerId ?? getConfiguredProviderId('transcribe')
	);
	const modelId = resolveModelId(
		providerId,
		normalized.modelId ??
			getConfiguredModelId(providerId, SPEECH_TO_TEXT_BATCH_API_TYPE, 'transcribe'),
		SPEECH_TO_TEXT_BATCH_API_TYPE
	);
	const provider = resolveProvider(providerId);
	const adapter = buildSttAdapter(provider);

	return adapter.transcribe({
		...normalized,
		providerId,
		modelId,
	});
}

export async function startRealtime(
	request: SttRealtimeStartRequest | undefined,
	onEvent: (event: SttRealtimeEvent) => void
): Promise<SttRealtimeSession> {
	const normalized = normalizeSttRealtimeStartRequest(request);
	const providerId = resolveProviderId(
		normalized.providerId ?? getConfiguredProviderId('realtime')
	);
	const modelId = resolveModelId(
		providerId,
		normalized.modelId ??
			getConfiguredModelId(providerId, SPEECH_TO_TEXT_STREAM_API_TYPE, 'realtime'),
		SPEECH_TO_TEXT_STREAM_API_TYPE
	);
	const provider = resolveProvider(providerId);
	const adapter = buildSttAdapter(provider);
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
		if (event.type === 'closed') realtimeSessions.delete(event.sessionId);
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
	realtimeSessions.set(session.id, { info: session, connection });
	emit({
		type: 'started',
		sessionId: session.id,
		providerId,
		model: modelId,
	});
	return session;
}

export async function appendRealtimeAudio(sessionId: string, audio: string): Promise<void> {
	const session = resolveRealtimeSession(sessionId);
	await session.connection.appendAudio(normalizeSttRealtimeAudioChunk(audio));
}

export async function finishRealtime(sessionId: string): Promise<void> {
	const session = resolveRealtimeSession(sessionId);
	await session.connection.finish();
}

export async function cancelRealtime(sessionId: string): Promise<void> {
	const session = resolveRealtimeSession(sessionId);
	realtimeSessions.delete(sessionId);
	await session.connection.cancel();
}

function resolveProviderId(providerId: string | undefined): SpeechToTextProviderId {
	const normalized = normalizeProviderId(providerId ?? OPENAI_SPEECH_TO_TEXT_PROVIDER_ID);
	if ((SPEECH_TO_TEXT_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		return normalized as SpeechToTextProviderId;
	}
	throw new SttProviderUnsupportedError(
		`Speech-to-text provider is not supported: ${normalized}`
	);
}

function resolveModelId(
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

	const model = providerModels(providerId, 'speech-to-text').find((candidate) =>
		getSpeechToTextModelApiTypes(providerId, candidate.id).includes(apiType)
	);
	if (!model) {
		throw new SttProviderUnsupportedError(
			`Speech-to-text provider has no ${apiType} transcription model: ${providerId}`
		);
	}
	return model.id;
}

function resolveProvider(providerId: SpeechToTextProviderId): SttProviderSpec {
	const provider = getProviderSpecFromProviderStore(providerId);
	if (!provider.apiKey) {
		throw new SttProviderAuthError(`${provider.name} API key not configured.`);
	}
	return provider;
}

function resolveRealtimeSession(sessionId: string): SttActiveRealtimeSession {
	const normalized = sessionId.trim();
	const session = realtimeSessions.get(normalized);
	if (!session) throw new Error(`Unknown speech-to-text realtime session: ${normalized}`);
	return session;
}

function getConfiguredProviderId(mode: SttSelectionMode): SpeechToTextProviderId | undefined {
	const providerId = getTranscribeProviderId(mode);
	if (!providerId) return undefined;
	try {
		return resolveProviderId(providerId);
	} catch {
		return undefined;
	}
}

function getConfiguredModelId(
	providerId: SpeechToTextProviderId,
	apiType: typeof SPEECH_TO_TEXT_BATCH_API_TYPE | typeof SPEECH_TO_TEXT_STREAM_API_TYPE,
	mode: SttSelectionMode
): string | undefined {
	const configuredProviderId = getConfiguredProviderId(mode);
	if (!configuredProviderId || configuredProviderId !== providerId) return undefined;
	const modelId = getTranscribeModelId(mode);
	return modelId && supportsSpeechToTextModelApiType(providerId, modelId, apiType)
		? modelId
		: undefined;
}

function getProviderSpecFromProviderStore(providerId: SpeechToTextProviderId): SttProviderSpec {
	const stored = getProvider(providerId);
	const defaults = defaultProvider(providerId);
	return {
		id: providerId,
		name: stored?.name || defaults?.name || providerId,
		apiKey: stored?.apiKey.trim() ?? '',
		baseURL: stored?.baseUrl || SPEECH_TO_TEXT_PROVIDER_BASE_URLS[providerId],
	};
}

function defaultProvider(providerId: string): CatalogProvider | undefined {
	return loadProviders().find((provider) => provider.id === providerId);
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
	return providerModels(providerId, 'speech-to-text').find((model) => model.id === normalizedModelId);
}

function realtimeSampleRate(providerId: SpeechToTextProviderId): number {
	return SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES[providerId] ?? STT_DEFAULT_REALTIME_SAMPLE_RATE;
}
