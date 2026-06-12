import {
	SttProviderAuthError,
	SttProviderUnsupportedError,
} from '../errors';
import type {
	SttAdapter,
	SttAdapterRealtimeStartRequest,
	SttAdapterTranscriptionRequest,
	SttProviderSpec,
	SttRealtimeConnection,
	SttRealtimeEventHandler,
} from '../types';
import type { SttTranscriptionResult } from '../../../shared/stt/transcription';

export class QwenSttAdapter implements SttAdapter {
	private readonly provider: SttProviderSpec;

	constructor(provider: SttProviderSpec) {
		if (!provider.apiKey) throw new SttProviderAuthError(`${provider.name} API key not configured.`);
		this.provider = provider;
	}

	async transcribe(_request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		throw new SttProviderUnsupportedError(
			`${this.provider.name} does not expose a batch speech-to-text adapter in this runtime.`
		);
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		_emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		throw new SttProviderUnsupportedError(
			`${this.provider.name} realtime speech-to-text is cataloged for ${request.modelId}, but no supported realtime transport is available in this runtime.`
		);
	}
}
