import { createAudioFile } from '../audio';
import WebSocket from 'ws';
import { SttProviderAuthError, SttProviderRequestError } from '../errors';
import type {
	SttAdapter,
	SttAdapterRealtimeStartRequest,
	SttAdapterTranscriptionRequest,
	SttProviderSpec,
	SttRealtimeConnection,
	SttRealtimeEventHandler,
} from '../types';
import type { SttTranscriptionResult } from '../../../shared/stt/transcription';
import {
	ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
} from '../../../shared/providers/models/stt';

const ELEVENLABS_STT_PATH = 'speech-to-text';
const ELEVENLABS_REALTIME_STT_PATH = 'speech-to-text/realtime';
const ELEVENLABS_API_KEY_HEADER = 'xi-api-key';
const ELEVENLABS_AUDIO_FORMAT_PREFIX = 'pcm';
const ELEVENLABS_INPUT_AUDIO_CHUNK_MESSAGE = 'input_audio_chunk';

type ElevenLabsTranscriptionResponse = {
	text?: string;
	language_code?: string;
	languageCode?: string;
};

type ElevenLabsRealtimeResponse = {
	message_type?: string;
	text?: string;
	transcript?: string;
	error?: string;
};

export interface ElevenLabsSttAdapterOptions extends SttProviderSpec {
	fetchFactory?: typeof fetch;
}

export class ElevenLabsSttAdapter implements SttAdapter {
	private readonly fetcher: typeof fetch;
	private readonly provider: SttProviderSpec;

	constructor(opts: ElevenLabsSttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		this.fetcher = opts.fetchFactory ?? fetch;
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		const file = await createAudioFile(request.audio);
		const form = new FormData();
		form.append('file', file);
		form.append('model_id', request.modelId);
		if (request.language) form.append('language_code', request.language);
		if (request.prompt) form.append('prompt', request.prompt);

		const endpoint = new URL(
			ELEVENLABS_STT_PATH,
			`${this.provider.baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]}/`
		);
		const response = await this.fetcher(endpoint, {
			method: 'POST',
			headers: {
				[ELEVENLABS_API_KEY_HEADER]: this.provider.apiKey,
			},
			body: form,
			signal: request.signal,
		});
		if (response.status === 401 || response.status === 403) {
			throw new SttProviderAuthError(await response.text());
		}
		if (!response.ok) {
			throw new SttProviderRequestError(await response.text());
		}

		const data = (await response.json()) as ElevenLabsTranscriptionResponse;

		return {
			text: data.text ?? '',
			metadata: {
				providerId: this.provider.id,
				providerName: this.provider.name,
				modelId: request.modelId,
				...(data.language_code || data.languageCode || request.language
					? { language: data.language_code ?? data.languageCode ?? request.language }
					: {}),
				createdAt: new Date().toISOString(),
			},
		};
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		const socket = new WebSocket(elevenLabsRealtimeUrl(this.provider.baseURL, request), {
			headers: {
				[ELEVENLABS_API_KEY_HEADER]: this.provider.apiKey,
			},
		});
		await waitForOpen(socket);
		return new ElevenLabsRealtimeSttConnection(socket, request, emit);
	}
}

class ElevenLabsRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;
	private partial = '';

	constructor(
		private readonly socket: WebSocket,
		private readonly request: SttAdapterRealtimeStartRequest,
		private readonly emit: SttRealtimeEventHandler
	) {
		this.socket.on('message', (data) => this.handleMessage(data.toString()));
		this.socket.once('close', () => this.emitClosed());
		this.socket.once('error', (error) => this.emitError(error.message));
	}

	async appendAudio(audio: string): Promise<void> {
		this.socket.send(
			JSON.stringify({
				message_type: ELEVENLABS_INPUT_AUDIO_CHUNK_MESSAGE,
				audio_base_64: audio,
				commit: false,
			})
		);
	}

	async finish(): Promise<void> {
		this.socket.send(
			JSON.stringify({
				message_type: ELEVENLABS_INPUT_AUDIO_CHUNK_MESSAGE,
				audio_base_64: '',
				commit: true,
			})
		);
	}

	async cancel(): Promise<void> {
		this.socket.close(1000, 'cancelled');
		this.emitClosed();
	}

	private handleMessage(message: string): void {
		let data: ElevenLabsRealtimeResponse;
		try {
			data = JSON.parse(message) as ElevenLabsRealtimeResponse;
		} catch {
			return;
		}

		if (data.message_type === 'partial_transcript' && data.text) {
			const delta = data.text.startsWith(this.partial)
				? data.text.slice(this.partial.length)
				: data.text;
			this.partial = data.text;
			this.emit({
				type: 'delta',
				sessionId: this.request.sessionId,
				itemId: this.request.sessionId,
				contentIndex: 0,
				delta,
			});
			return;
		}
		if (
			(data.message_type === 'committed_transcript' ||
				data.message_type === 'committed_transcript_with_timestamps') &&
			(data.transcript || data.text)
		) {
			this.emit({
				type: 'completed',
				sessionId: this.request.sessionId,
				itemId: this.request.sessionId,
				contentIndex: 0,
				transcript: data.transcript ?? data.text ?? '',
			});
			this.socket.close(1000, 'completed');
			return;
		}
		if (data.message_type === 'error') {
			this.emitError(data.error ?? 'ElevenLabs realtime transcription error.');
		}
	}

	private emitError(message: string): void {
		if (!this.closed) this.emit({ type: 'error', sessionId: this.request.sessionId, message });
	}

	private emitClosed(): void {
		if (this.closed) return;
		this.closed = true;
		this.emit({ type: 'closed', sessionId: this.request.sessionId });
	}
}

function elevenLabsRealtimeUrl(
	baseURL: string | undefined,
	request: SttAdapterRealtimeStartRequest
): string {
	const url = new URL(
		ELEVENLABS_REALTIME_STT_PATH,
		`${baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]}/`
	);
	url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
	url.searchParams.set('model_id', request.modelId);
	url.searchParams.set('audio_format', `${ELEVENLABS_AUDIO_FORMAT_PREFIX}_${request.sampleRate}`);
	if (request.language) url.searchParams.set('language_code', request.language);
	return url.toString();
}

async function waitForOpen(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return;
	await new Promise<void>((resolve, reject) => {
		socket.once('open', resolve);
		socket.once('error', reject);
	});
}
