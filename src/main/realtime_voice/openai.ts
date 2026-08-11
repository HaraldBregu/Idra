import OpenAI from 'openai';
import { OpenAIRealtimeWS } from 'openai/realtime/ws';
import type { RealtimeServerEvent, RealtimeSessionCreateRequest } from 'openai/resources/realtime/realtime';
import type {
	RealtimeSocket,
	RealtimeSocketFactory,
	RealtimeVoiceAdapter,
	RealtimeVoiceAdapterEventHandler,
	RealtimeVoiceAdapterRequest,
	RealtimeVoiceConnection,
} from './types';
import { REALTIME_VOICE_MAX_AUDIO_BASE64_LENGTH } from '../../shared/realtime_voice';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const CONNECT_TIMEOUT_MS = 15_000;

export class OpenAIRealtimeVoiceAdapter implements RealtimeVoiceAdapter {
	constructor(
		private readonly socketFactory: RealtimeSocketFactory = createSocket,
		private readonly connectTimeoutMs = CONNECT_TIMEOUT_MS
	) {}

	async connect(
		request: RealtimeVoiceAdapterRequest,
		emit: RealtimeVoiceAdapterEventHandler,
		signal?: AbortSignal
	): Promise<RealtimeVoiceConnection> {
		const socket = this.socketFactory(request.apiKey, request.model);
		const connection = new OpenAIRealtimeVoiceConnection(socket, emit);
		await connection.open(request, this.connectTimeoutMs, signal);
		return connection;
	}
}

class OpenAIRealtimeVoiceConnection implements RealtimeVoiceConnection {
	private closed = false;
	private responseActive = false;

	constructor(
		private readonly realtime: RealtimeSocket,
		private readonly emit: RealtimeVoiceAdapterEventHandler
	) {}

	open(request: RealtimeVoiceAdapterRequest, timeoutMs: number, signal?: AbortSignal): Promise<void> {
		return new Promise((resolve, reject) => {
			let settled = false;
			const settle = (error?: Error): void => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				signal?.removeEventListener('abort', abort);
				if (error) reject(error);
				else resolve();
			};
			const abort = (): void => {
				const reason = signal?.reason;
				settle(reason instanceof Error ? reason : new DOMException('Voice session stopped.', 'AbortError'));
				void this.stop();
			};
			const timer = setTimeout(() => {
				settle(new Error('Realtime voice connection timed out.'));
				void this.stop();
			}, timeoutMs);
			timer.unref?.();

			this.realtime.on('event', (event) => {
				if (event.type === 'session.updated') settle();
				this.handleEvent(event);
			});
			this.realtime.on('error', (error) => {
				if (!settled) settle(error);
				else this.emit({ type: 'error', message: error.message });
			});
			this.realtime.socket.on('close', () => {
				this.closed = true;
				if (!settled) settle(new Error('Realtime voice connection closed before setup.'));
				this.emit({ type: 'closed' });
			});
			this.realtime.socket.on('open', () => {
				this.realtime.send({
					type: 'session.update',
					session: sessionConfiguration(request),
				});
			});
			signal?.addEventListener('abort', abort, { once: true });
			if (signal?.aborted) abort();
		});
	}

	async appendAudio(audio: string): Promise<void> {
		if (this.closed) throw new Error('Realtime voice connection is closed.');
		if (
			this.realtime.socket.bufferedAmount + audio.length >
			REALTIME_VOICE_MAX_AUDIO_BASE64_LENGTH
		) {
			throw new Error('Realtime voice transport queue is full.');
		}
		this.realtime.send({ type: 'input_audio_buffer.append', audio });
	}

	async interrupt(): Promise<void> {
		if (this.closed || !this.responseActive) return;
		this.realtime.send({ type: 'response.cancel' });
	}

	async addToolResult(callId: string, output: string): Promise<void> {
		if (this.closed) return;
		this.realtime.send({
			type: 'conversation.item.create',
			item: { type: 'function_call_output', call_id: callId, output },
		});
		this.realtime.send({ type: 'response.create' });
	}

	async stop(): Promise<void> {
		if (this.closed) return;
		this.closed = true;
		this.realtime.close({ code: 1000, reason: 'Voice session stopped.' });
	}

	private handleEvent(event: RealtimeServerEvent): void {
		if (event.type === 'response.created') {
			this.responseActive = true;
			return;
		}
		if (event.type === 'response.done') {
			this.responseActive = false;
			return;
		}
		if (
			event.type === 'response.output_item.added' &&
			event.item.type === 'function_call' &&
			event.item.call_id
		) {
			this.emit({
				type: 'tool_call_start',
				callId: event.item.call_id,
				itemId: event.item.id ?? '',
				responseId: event.response_id,
				name: event.item.name,
			});
			return;
		}
		if (event.type === 'input_audio_buffer.speech_started') {
			this.emit({ type: 'input_speech_started', itemId: event.item_id });
			return;
		}
		if (event.type === 'input_audio_buffer.speech_stopped') {
			this.emit({ type: 'input_speech_stopped', itemId: event.item_id });
			return;
		}
		if (event.type === 'response.output_audio_transcript.delta') {
			this.emit({
				type: 'assistant_transcript_delta',
				itemId: event.item_id,
				responseId: event.response_id,
				delta: event.delta,
			});
			return;
		}
		if (event.type === 'response.output_audio_transcript.done') {
			this.emit({
				type: 'assistant_transcript_final',
				itemId: event.item_id,
				responseId: event.response_id,
				transcript: event.transcript,
			});
			return;
		}
		if (event.type === 'response.output_audio.delta') {
			this.emit({
				type: 'assistant_audio_delta',
				itemId: event.item_id,
				responseId: event.response_id,
				audio: event.delta,
			});
			return;
		}
		if (event.type === 'response.output_audio.done') {
			this.emit({
				type: 'assistant_audio_done',
				itemId: event.item_id,
				responseId: event.response_id,
			});
			return;
		}
		if (event.type === 'response.function_call_arguments.delta') {
			this.emit({
				type: 'tool_call_args_delta',
				callId: event.call_id,
				itemId: event.item_id,
				responseId: event.response_id,
				delta: event.delta,
			});
			return;
		}
		if (event.type === 'response.function_call_arguments.done') {
			this.emit({
				type: 'tool_call',
				callId: event.call_id,
				itemId: event.item_id,
				responseId: event.response_id,
				name: event.name,
				arguments: event.arguments,
			});
			return;
		}
		if (event.type === 'error') this.emit({ type: 'error', message: event.error.message });
	}
}

function createSocket(apiKey: string, model: string): RealtimeSocket {
	const client = new OpenAI({ apiKey, baseURL: OPENAI_BASE_URL });
	return new OpenAIRealtimeWS({ model }, client) as RealtimeSocket;
}

function sessionConfiguration(request: RealtimeVoiceAdapterRequest): RealtimeSessionCreateRequest {
	return {
		type: 'realtime',
		model: request.model,
		instructions: request.instructions,
		output_modalities: ['audio'],
		parallel_tool_calls: false,
		audio: {
			input: {
				format: { type: 'audio/pcm', rate: 24_000 },
				noise_reduction: { type: 'near_field' },
				turn_detection: {
					type: 'server_vad',
					create_response: true,
					interrupt_response: true,
				},
			},
			output: {
				format: { type: 'audio/pcm', rate: 24_000 },
				voice: request.voice,
			},
		},
		tool_choice: 'auto',
		tools: request.tools.map((tool) => ({
			type: 'function',
			name: tool.id,
			description: tool.description,
			parameters: tool.schema,
		})),
	};
}
