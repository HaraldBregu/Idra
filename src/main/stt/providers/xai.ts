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
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
	XAI_SPEECH_TO_TEXT_PROVIDER_ID,
} from '../../../shared/providers/models/stt';

const XAI_STT_PATH = 'stt';
const XAI_STT_AUTH_SCHEME = 'Bearer';
const XAI_REALTIME_AUDIO_DONE = 'audio.done';

type XaiTranscriptionResponse = {
	text?: string;
	language?: string;
	duration?: number;
	segments?: Array<{ text?: string }>;
};

type XaiRealtimeResponse = {
	type?: string;
	text?: string;
	delta?: string;
	error?: { message?: unknown };
};

export interface XaiSttAdapterOptions extends SttProviderSpec {
	fetchFactory?: typeof fetch;
}

export class XaiSttAdapter implements SttAdapter {
	private readonly fetcher: typeof fetch;
	private readonly provider: SttProviderSpec;

	constructor(opts: XaiSttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		this.fetcher = opts.fetchFactory ?? fetch;
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		const file = await createAudioFile(request.audio);
		const form = new FormData();
		if (request.language) form.append('language', request.language);
		if (request.prompt) form.append('prompt', request.prompt);
		form.append('file', file);

		const response = await this.fetcher(xaiSttUrl(this.provider.baseURL), {
			method: 'POST',
			headers: {
				Authorization: `${XAI_STT_AUTH_SCHEME} ${this.provider.apiKey}`,
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

		const data = (await response.json()) as XaiTranscriptionResponse;
		const text = data.text ?? data.segments?.map((segment) => segment.text ?? '').join('') ?? '';
		const usage = toUsage(data);

		return {
			text,
			metadata: {
				providerId: this.provider.id,
				providerName: this.provider.name,
				modelId: request.modelId,
				...(data.language || request.language
					? { language: data.language ?? request.language }
					: {}),
				createdAt: new Date().toISOString(),
				...(usage ? { usage } : {}),
			},
		};
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		const socket = new WebSocket(xaiRealtimeUrl(this.provider.baseURL), {
			headers: {
				Authorization: `${XAI_STT_AUTH_SCHEME} ${this.provider.apiKey}`,
			},
		});
		await waitForOpen(socket);
		return new XaiRealtimeSttConnection(socket, request, emit);
	}
}

class XaiRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;
	private transcript = '';

	constructor(
		private readonly socket: WebSocket,
		private readonly request: SttAdapterRealtimeStartRequest,
		private readonly emit: SttRealtimeEventHandler
	) {
		this.socket.on('message', (data, isBinary) => {
			if (!isBinary) this.handleMessage(data.toString());
		});
		this.socket.once('close', () => this.emitClosed());
		this.socket.once('error', (error) => this.emitError(error.message));
	}

	async appendAudio(audio: string): Promise<void> {
		this.socket.send(Buffer.from(audio, 'base64'));
	}

	async finish(): Promise<void> {
		this.socket.send(JSON.stringify({ type: XAI_REALTIME_AUDIO_DONE }));
	}

	async cancel(): Promise<void> {
		this.socket.close(1000, 'cancelled');
		this.emitClosed();
	}

	private handleMessage(message: string): void {
		let data: XaiRealtimeResponse;
		try {
			data = JSON.parse(message) as XaiRealtimeResponse;
		} catch {
			return;
		}

		if (data.type === 'transcript.partial' && data.delta) {
			this.transcript += data.delta;
			this.emit({
				type: 'delta',
				sessionId: this.request.sessionId,
				itemId: this.request.sessionId,
				contentIndex: 0,
				delta: data.delta,
			});
			return;
		}
		if (data.type === 'transcript.done') {
			const transcript = data.text ?? this.transcript;
			this.emit({
				type: 'completed',
				sessionId: this.request.sessionId,
				itemId: this.request.sessionId,
				contentIndex: 0,
				transcript,
			});
			this.socket.close(1000, 'completed');
			return;
		}
		if (data.type === 'error') {
			this.emitError(errorMessage(data.error, 'xAI realtime transcription error.'));
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

function xaiSttUrl(baseURL: string | undefined): URL {
	return new URL(
		XAI_STT_PATH,
		`${baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[XAI_SPEECH_TO_TEXT_PROVIDER_ID]}/`
	);
}

function xaiRealtimeUrl(baseURL: string | undefined): string {
	const url = xaiSttUrl(baseURL);
	url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
	return url.toString();
}

async function waitForOpen(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return;
	await new Promise<void>((resolve, reject) => {
		socket.once('open', resolve);
		socket.once('error', reject);
	});
}

function errorMessage(error: unknown, fallback: string): string {
	if (
		error &&
		typeof error === 'object' &&
		typeof (error as { message?: unknown }).message === 'string'
	) {
		return (error as { message: string }).message;
	}
	return fallback;
}

function toUsage(data: XaiTranscriptionResponse): SttUsage | undefined {
	return typeof data.duration === 'number' ? { durationSeconds: data.duration } : undefined;
}
