export const STT_AUDIO_ENCODINGS = ['base64'] as const;
export const STT_MAX_AUDIO_BASE64_LENGTH = 64 * 1024 * 1024;
export const STT_MAX_LANGUAGE_LENGTH = 35;
export const STT_MAX_PROMPT_LENGTH = 2_000;

export type SttAudioEncoding = (typeof STT_AUDIO_ENCODINGS)[number];

export interface SttAudioInput {
	data: string;
	encoding: SttAudioEncoding;
	mimeType: string;
	fileName?: string;
	byteLength?: number;
}

export interface SttTranscriptionRequest {
	audio: SttAudioInput;
	providerId?: string;
	modelId?: string;
	language?: string;
	prompt?: string;
	temperature?: number;
}

export interface SttUsage {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	durationSeconds?: number;
}

export interface SttTranscriptionMetadata {
	providerId: string;
	providerName: string;
	modelId: string;
	language?: string;
	createdAt: string;
	usage?: SttUsage;
}

export interface SttTranscriptionResult {
	text: string;
	metadata: SttTranscriptionMetadata;
}

export function normalizeSttTranscriptionRequest(
	request: SttTranscriptionRequest
): SttTranscriptionRequest {
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Invalid speech-to-text transcription request.');
	}

	const audio = request.audio;
	if (!audio || typeof audio !== 'object' || Array.isArray(audio)) {
		throw new Error('Speech-to-text audio is required.');
	}
	if (audio.encoding !== 'base64') {
		throw new Error('Speech-to-text audio must use base64 encoding.');
	}
	if (typeof audio.data !== 'string' || audio.data.length === 0) {
		throw new Error('Speech-to-text audio data is required.');
	}
	if (audio.data.length > STT_MAX_AUDIO_BASE64_LENGTH) {
		throw new Error('Speech-to-text audio is too large.');
	}
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audio.data)) {
		throw new Error('Speech-to-text audio data must be valid base64.');
	}
	if (typeof audio.mimeType !== 'string' || !audio.mimeType.trim()) {
		throw new Error('Speech-to-text audio MIME type is required.');
	}

	const providerId = optionalTrimmedString(request.providerId);
	const modelId = optionalTrimmedString(request.modelId);
	const language = optionalTrimmedString(request.language);
	const prompt = optionalTrimmedString(request.prompt);
	const fileName = optionalTrimmedString(audio.fileName);

	if (language && language.length > STT_MAX_LANGUAGE_LENGTH) {
		throw new Error('Speech-to-text language is too long.');
	}
	if (prompt && prompt.length > STT_MAX_PROMPT_LENGTH) {
		throw new Error('Speech-to-text prompt is too long.');
	}
	if (
		request.temperature !== undefined &&
		(!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 1)
	) {
		throw new Error('Speech-to-text temperature must be between 0 and 1.');
	}

	return {
		audio: {
			data: audio.data,
			encoding: audio.encoding,
			mimeType: audio.mimeType.trim(),
			...(fileName ? { fileName } : {}),
			...(typeof audio.byteLength === 'number' && audio.byteLength > 0
				? { byteLength: Math.floor(audio.byteLength) }
				: {}),
		},
		...(providerId ? { providerId } : {}),
		...(modelId ? { modelId } : {}),
		...(language ? { language } : {}),
		...(prompt ? { prompt } : {}),
		...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
	};
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
