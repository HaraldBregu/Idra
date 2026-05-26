import { Buffer } from 'node:buffer';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import {
	isAllowedTextToSpeechModel,
	type ConfiguredModelOperator,
	type Model,
} from '../../shared/agents/service';
import type { Provider } from '../../shared/providers';
import type { ModelModuleSettings } from '../../shared/store';
import {
	normalizeTextToSpeechSynthesisRequest,
	type TextToSpeechAudioFormat,
	type TextToSpeechSynthesisRequest,
	type TextToSpeechSynthesisResult,
} from '../../shared/tts';

interface TextToSpeechServiceDependencies {
	store: StoreService;
	logger?: Pick<LoggerService, 'error' | 'info'>;
	clients?: readonly TextToSpeechProviderClient[];
	fetch?: typeof fetch;
}

interface ResolvedTextToSpeechRuntime {
	operator: ConfiguredModelOperator;
	provider: Provider;
	model: Model;
	settings: ModelModuleSettings;
}

interface TextToSpeechRuntimeRequest {
	text: string;
	format: TextToSpeechAudioFormat;
	voiceId?: string;
}

interface TextToSpeechProviderConfig extends ResolvedTextToSpeechRuntime {
	request: TextToSpeechRuntimeRequest;
}

interface TextToSpeechProviderAudio {
	data: ArrayBuffer | Uint8Array;
	mimeType: string;
	format: TextToSpeechAudioFormat;
	voiceId?: string;
}

interface TextToSpeechProviderClient {
	supports(providerId: string, modelId: string): boolean;
	synthesize(config: TextToSpeechProviderConfig): Promise<TextToSpeechProviderAudio>;
}

const DEFAULT_AUDIO_FORMAT: TextToSpeechAudioFormat = 'mp3';
const DEFAULT_OPENAI_VOICE_ID = 'alloy';
const OPENAI_PROVIDER_ID = 'openai';
const ELEVENLABS_PROVIDER_ID = 'elevenlabs';

export class TextToSpeechService {
	private readonly clients: readonly TextToSpeechProviderClient[];

	constructor(private readonly dependencies: TextToSpeechServiceDependencies) {
		const fetchImpl = dependencies.fetch ?? fetch;
		this.clients = dependencies.clients ?? [
			new OpenAITextToSpeechClient(fetchImpl),
			new ElevenLabsTextToSpeechClient(fetchImpl),
		];
	}

	async synthesize(
		request: TextToSpeechSynthesisRequest | string
	): Promise<TextToSpeechSynthesisResult> {
		const normalized = normalizeTextToSpeechSynthesisRequest(request);
		const resolved = this.resolveRuntime();
		const runtimeRequest = this.runtimeRequest(normalized, resolved);
		const client = this.clients.find((candidate) =>
			candidate.supports(resolved.provider.id, resolved.model.id)
		);
		if (!client) {
			throw new Error(
				`No text-to-speech provider client is available for provider "${resolved.provider.id}" and model "${resolved.model.id}".`
			);
		}

		try {
			const audio = await client.synthesize({ ...resolved, request: runtimeRequest });
			const bytes = audioBytes(audio.data);
			if (bytes.byteLength === 0) throw new Error('Text-to-speech provider returned empty audio.');
			this.dependencies.logger?.info('TextToSpeechService', 'Synthesized speech audio', {
				providerId: resolved.provider.id,
				modelId: resolved.model.id,
				byteLength: bytes.byteLength,
			});
			return {
				audio: {
					data: bytes.toString('base64'),
					encoding: 'base64',
					mimeType: audio.mimeType || mimeTypeForFormat(audio.format),
					byteLength: bytes.byteLength,
				},
				metadata: {
					providerId: resolved.provider.id,
					providerName: resolved.provider.name,
					modelId: resolved.model.id,
					modelName: resolved.model.name,
					format: audio.format,
					...(audio.voiceId ? { voiceId: audio.voiceId } : {}),
					createdAt: new Date().toISOString(),
				},
			};
		} catch (error) {
			const message = errorMessage(error);
			this.dependencies.logger?.error('TextToSpeechService', 'Provider synthesis failed', {
				providerId: resolved.provider.id,
				modelId: resolved.model.id,
				error: message,
			});
			throw new Error(`Text-to-speech provider failed: ${message}`);
		}
	}

	private resolveRuntime(): ResolvedTextToSpeechRuntime {
		const settings = this.dependencies.store.getTextToSpeechSettings();
		if (!settings) {
			throw new Error('Text-to-speech is not configured. Select a provider and model in Settings.');
		}

		const providerId = settings.providerId.trim().toLowerCase();
		const modelId = settings.modelId.trim();
		if (!providerId) throw new Error('Text-to-speech provider is not configured.');
		if (!modelId) throw new Error('Text-to-speech model is not configured.');
		if (!isAllowedTextToSpeechModel(providerId, modelId)) {
			throw new Error(`Model is not supported for text-to-speech: ${modelId}`);
		}

		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Text-to-speech provider is not configured: ${providerId}`);
		if (!provider.apiKey.trim()) {
			throw new Error(`API key missing for text-to-speech provider: ${providerId}`);
		}

		const operator = this.dependencies.store.getTextToSpeechOperator();
		if (!operator) {
			throw new Error('Text-to-speech settings are invalid. Select a supported provider and model.');
		}

		return {
			operator,
			provider,
			model: {
				id: modelId,
				name: operator.model.name,
			},
			settings,
		};
	}

	private runtimeRequest(
		request: TextToSpeechSynthesisRequest,
		resolved: ResolvedTextToSpeechRuntime
	): TextToSpeechRuntimeRequest {
		const format = request.format ?? DEFAULT_AUDIO_FORMAT;
		const voiceId =
			request.voiceId ?? readSettingString(resolved.settings.options, 'voiceId') ?? defaultVoiceId(resolved.provider.id);
		return {
			text: request.text,
			format,
			...(voiceId ? { voiceId } : {}),
		};
	}
}

class OpenAITextToSpeechClient implements TextToSpeechProviderClient {
	constructor(private readonly fetchImpl: typeof fetch) {}

	supports(providerId: string): boolean {
		return providerId === OPENAI_PROVIDER_ID;
	}

	async synthesize(config: TextToSpeechProviderConfig): Promise<TextToSpeechProviderAudio> {
		const format = openAiAudioFormat(config.request.format);
		const response = await this.fetchImpl(openAiSpeechUrl(config.provider.baseUrl), {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.provider.apiKey.trim()}`,
				'Content-Type': 'application/json',
				Accept: mimeTypeForFormat(format),
			},
			body: JSON.stringify({
				model: config.model.id,
				input: config.request.text,
				voice: config.request.voiceId ?? DEFAULT_OPENAI_VOICE_ID,
				response_format: format,
			}),
		});
		const audio = await readAudioResponse(response, 'OpenAI text-to-speech', format);
		return {
			...audio,
			format,
			voiceId: config.request.voiceId ?? DEFAULT_OPENAI_VOICE_ID,
		};
	}
}

class ElevenLabsTextToSpeechClient implements TextToSpeechProviderClient {
	constructor(private readonly fetchImpl: typeof fetch) {}

	supports(providerId: string): boolean {
		return providerId === ELEVENLABS_PROVIDER_ID;
	}

	async synthesize(config: TextToSpeechProviderConfig): Promise<TextToSpeechProviderAudio> {
		if (!config.request.voiceId) {
			throw new Error('Text-to-speech voiceId setting is required for provider: elevenlabs');
		}

		const format = elevenLabsAudioFormat(config.request.format);
		const response = await this.fetchImpl(
			elevenLabsSpeechUrl(config.provider.baseUrl, config.request.voiceId, format),
			{
				method: 'POST',
				headers: {
					'xi-api-key': config.provider.apiKey.trim(),
					'Content-Type': 'application/json',
					Accept: mimeTypeForFormat(config.request.format),
				},
				body: JSON.stringify({
					text: config.request.text,
					model_id: config.model.id,
				}),
			}
		);
		const audio = await readAudioResponse(
			response,
			'ElevenLabs text-to-speech',
			config.request.format
		);
		return {
			...audio,
			format: config.request.format,
			voiceId: config.request.voiceId,
		};
	}
}

function defaultVoiceId(providerId: string): string | undefined {
	if (providerId === OPENAI_PROVIDER_ID) return DEFAULT_OPENAI_VOICE_ID;
	return undefined;
}

function readSettingString(options: Record<string, unknown> | undefined, key: string): string | undefined {
	const value = options?.[key];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function openAiSpeechUrl(baseUrl: string): string {
	return appendEndpoint(baseUrl, '/audio/speech', 'https://api.openai.com/v1');
}

function elevenLabsSpeechUrl(baseUrl: string, voiceId: string, outputFormat: string): string {
	const url = new URL(
		appendEndpoint(
			baseUrl,
			`/text-to-speech/${encodeURIComponent(voiceId)}`,
			'https://api.elevenlabs.io/v1'
		)
	);
	url.searchParams.set('output_format', outputFormat);
	return url.toString();
}

function appendEndpoint(baseUrl: string, endpoint: string, fallbackBaseUrl: string): string {
	const url = new URL(baseUrl.trim() || fallbackBaseUrl);
	const path = url.pathname.replace(/\/+$/, '');
	if (path.endsWith(endpoint)) {
		url.pathname = path;
	} else if (!path || path === '/') {
		url.pathname = `/v1${endpoint}`;
	} else if (path.endsWith('/v1')) {
		url.pathname = `${path}${endpoint}`;
	} else {
		url.pathname = `${path}${endpoint}`;
	}
	url.search = '';
	url.hash = '';
	return url.toString();
}

function openAiAudioFormat(format: TextToSpeechAudioFormat): TextToSpeechAudioFormat {
	if (format === 'pcm') return 'pcm';
	if (format === 'opus') return 'opus';
	if (format === 'wav') return 'wav';
	return 'mp3';
}

function elevenLabsAudioFormat(format: TextToSpeechAudioFormat): string {
	if (format === 'pcm') return 'pcm_24000';
	if (format === 'opus') return 'opus_48000_128';
	if (format === 'wav') return 'mp3_44100_128';
	return 'mp3_44100_128';
}

function mimeTypeForFormat(format: TextToSpeechAudioFormat): string {
	if (format === 'wav') return 'audio/wav';
	if (format === 'opus') return 'audio/ogg';
	if (format === 'pcm') return 'audio/pcm';
	return 'audio/mpeg';
}

async function readAudioResponse(
	response: Response,
	label: string,
	format: TextToSpeechAudioFormat
): Promise<Pick<TextToSpeechProviderAudio, 'data' | 'mimeType'>> {
	if (!response.ok) {
		const message = await responseMessage(response);
		throw new Error(`${label} failed (${response.status}): ${message}`);
	}
	const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() || mimeTypeForFormat(format);
	return {
		data: await response.arrayBuffer(),
		mimeType,
	};
}

async function responseMessage(response: Response): Promise<string> {
	try {
		const text = await response.text();
		return text.trim() || response.statusText || 'request failed';
	} catch {
		return response.statusText || 'request failed';
	}
}

function audioBytes(data: ArrayBuffer | Uint8Array): Buffer {
	if (data instanceof ArrayBuffer) return Buffer.from(data);
	return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return 'Text-to-speech synthesis failed.';
}
