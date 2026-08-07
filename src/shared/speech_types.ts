export const SPEECH_MAX_TEXT_LENGTH = 4096;

export interface SpeechSynthesisRequest {
	text: string;
	providerId?: string;
	modelId?: string;
	voice?: string;
	/** Provider-specific controls declared in the selected model metadata. */
	options?: Record<string, unknown>;
}

export interface SpeechSynthesisMetadata {
	providerId: string;
	providerName: string;
	modelId: string;
	createdAt: string;
}

export interface SpeechSynthesisResult {
	audio: string;
	mimeType: string;
	metadata: SpeechSynthesisMetadata;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

export function normalizeSpeechSynthesisRequest(
	request: SpeechSynthesisRequest
): SpeechSynthesisRequest {
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Invalid speech synthesis request.');
	}
	const text = typeof request.text === 'string' ? request.text.trim() : '';
	if (!text) {
		throw new Error('Speech synthesis text is required.');
	}
	if (text.length > SPEECH_MAX_TEXT_LENGTH) {
		throw new Error('Speech synthesis text is too long.');
	}
	return {
		text,
		providerId: optionalTrimmedString(request.providerId),
		modelId: optionalTrimmedString(request.modelId),
		voice: optionalTrimmedString(request.voice),
		...(isOptions(request.options) ? { options: request.options } : {}),
	};
}

function isOptions(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
