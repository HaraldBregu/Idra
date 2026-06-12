import WebSocket from 'ws';
import { createAudioFile } from '../audio';
import { SttProviderAuthError, SttProviderRequestError } from '../errors';
import type {
	SttAdapter,
	SttAdapterRealtimeStartRequest,
	SttAdapterTranscriptionRequest,
	SttProviderSpec,
	SttRealtimeConnection,
	SttRealtimeEventHandler,
} from '../types';
import type { SttTranscriptionResult, SttUsage } from '../../../shared/stt/transcription';
import {
	DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
	DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
} from '../../../shared/providers/models/stt';

const DEEPGRAM_LISTEN_PATH = 'listen';
const DEEPGRAM_FLUX_LISTEN_PATH = '../v2/listen';
const DEEPGRAM_AUTH_SCHEME = 'Token';
const DEEPGRAM_LINEAR16_ENCODING = 'linear16';

type DeepgramTranscriptionResponse = {
	metadata?: {
		duration?: number;
	};
	results?: {
		channels?: Array<{
			alternatives?: Array<{
				transcript?: string;
			}>;
		}>;
	};
};

export interface DeepgramSttAdapterOptions extends SttProviderSpec {
	fetchFactory?: typeof fetch;
}

export class DeepgramSttAdapter implements SttAdapter {
	private readonly fetcher: typeof fetch;
	private readonly provider: SttProviderSpec;

	constructor(opts: DeepgramSttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		this.fetcher = opts.fetchFactory ?? fetch;
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		const file = await createAudioFile(request.audio);
		const body = Buffer.from(await file.arrayBuffer());
		const endpoint = new URL(
			DEEPGRAM_LISTEN_PATH,
			`${this.provider.baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]}/`
		);
		endpoint.searchParams.set('model', request.modelId);
		if (request.language) endpoint.searchParams.set('language', request.language);
		if (request.prompt) endpoint.searchParams.set('keywords', request.prompt);

		const response = await this.fetcher(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `${DEEPGRAM_AUTH_SCHEME} ${this.provider.apiKey}`,
				'Content-Type': request.audio.mimeType,
			},
			body,
			signal: request.signal,
		});
		if (response.status === 401 || response.status === 403) {
			throw new SttProviderAuthError(await response.text());
		}
		if (!response.ok) {
			throw new SttProviderRequestError(await response.text());
		}

		const data = (await response.json()) as DeepgramTranscriptionResponse;
		const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
		const usage = toUsage(data.metadata);

		return {
			text,
			metadata: {
				providerId: this.provider.id,
				providerName: this.provider.name,
				modelId: request.modelId,
				...(request.language ? { language: request.language } : {}),
				createdAt: new Date().toISOString(),
				...(usage ? { usage } : {}),
			},
		};
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		const socket = new WebSocket(deepgramRealtimeUrl(this.provider.baseURL, request), {
			headers: { Authorization: `${DEEPGRAM_AUTH_SCHEME} ${this.provider.apiKey}` },
		});
		await waitForOpen(socket);
		return new DeepgramRealtimeSttConnection(socket, request, emit);
	}
}

type DeepgramRealtimeResponse = {
	type?: string;
	is_final?: boolean;
	speech_final?: boolean;
	channel?: {
		alternatives?: Array<{
			transcript?: string;
		}>;
	};
};

class DeepgramRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;
	private completedCount = 0;

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
		this.socket.send(Buffer.from(audio, 'base64'));
	}

	async finish(): Promise<void> {
		this.socket.send(JSON.stringify({ type: 'CloseStream' }));
	}

	async cancel(): Promise<void> {
		this.socket.close(1000, 'cancelled');
		this.emitClosed();
	}

	private handleMessage(message: string): void {
		let data: DeepgramRealtimeResponse;
		try {
			data = JSON.parse(message) as DeepgramRealtimeResponse;
		} catch {
			return;
		}
		if (data.type === 'CloseStream') {
			this.socket.close(1000, 'completed');
			return;
		}
		if (data.type === 'TurnInfo') {
			const transcript = data.channel?.alternatives?.[0]?.transcript;
			if (!transcript) return;
			this.completedCount += 1;
			this.emit({
				type: 'completed',
				sessionId: this.request.sessionId,
				itemId: `${this.request.sessionId}-${this.completedCount}`,
				contentIndex: 0,
				transcript,
			});
			return;
		}
		const transcript = data.channel?.alternatives?.[0]?.transcript;
		if (!transcript) return;

		if (data.speech_final) {
			this.emit({
				type: 'committed',
				sessionId: this.request.sessionId,
				itemId: this.request.sessionId,
			});
		}
		if (data.is_final) {
			this.completedCount += 1;
			this.emit({
				type: 'completed',
				sessionId: this.request.sessionId,
				itemId: `${this.request.sessionId}-${this.completedCount}`,
				contentIndex: 0,
				transcript,
			});
			return;
		}
		this.emit({
			type: 'delta',
			sessionId: this.request.sessionId,
			itemId: this.request.sessionId,
			contentIndex: 0,
			delta: transcript,
		});
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

function deepgramRealtimeUrl(
	baseURL: string | undefined,
	request: SttAdapterRealtimeStartRequest
): string {
	const path =
		request.modelId === DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID
			? DEEPGRAM_FLUX_LISTEN_PATH
			: DEEPGRAM_LISTEN_PATH;
	const url = new URL(
		path,
		`${baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]}/`
	);
	url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
	url.searchParams.set('model', request.modelId);
	url.searchParams.set('encoding', DEEPGRAM_LINEAR16_ENCODING);
	url.searchParams.set('sample_rate', String(request.sampleRate));
	url.searchParams.set('channels', '1');
	url.searchParams.set('interim_results', 'true');
	url.searchParams.set('smart_format', 'true');
	if (request.language) url.searchParams.set('language', request.language);
	return url.toString();
}

async function waitForOpen(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return;
	await new Promise<void>((resolve, reject) => {
		socket.once('open', resolve);
		socket.once('error', reject);
	});
}

function toUsage(metadata: DeepgramTranscriptionResponse['metadata']): SttUsage | undefined {
	if (!metadata || typeof metadata.duration !== 'number') return undefined;
	return { durationSeconds: metadata.duration };
}
