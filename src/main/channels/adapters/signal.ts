import { randomUUID } from 'node:crypto';
import type {
	ChannelAdapter,
	ChannelInboundHandler,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusHandler,
	ChannelStatusUpdate,
} from '../channels_types';

export interface SignalAdapterOptions {
	accountId: string;
	baseUrl?: string;
}

type SignalAttachment = {
	contentType?: string;
	filename?: string;
	id?: string;
	size?: number;
};

type SignalEnvelope = {
	source?: string;
	sourceNumber?: string;
	sourceUuid?: string;
	sourceName?: string;
	timestamp?: number;
	dataMessage?: {
		timestamp?: number;
		message?: string;
		groupInfo?: { groupId?: string };
		attachments?: SignalAttachment[];
	};
};

type SignalReceive = {
	method?: string;
	params?: { envelope?: SignalEnvelope; result?: { envelope?: SignalEnvelope } };
};

const SIGNAL_RECONNECT_DELAY_MS = 2_000;

export function createSignalAdapter(options: SignalAdapterOptions): ChannelAdapter {
	const accountId = options.accountId.trim();
	if (!accountId) throw new Error('Signal account is required');
	const baseUrl = (options.baseUrl?.trim() || 'http://127.0.0.1:8080').replace(/\/$/, '');
	const endpoint = new URL(baseUrl);
	if (!['127.0.0.1', 'localhost', '::1'].includes(endpoint.hostname)) {
		throw new Error('Signal daemon must use a loopback address');
	}
	const messageHandlers = new Set<ChannelInboundHandler>();
	const statusHandlers = new Set<ChannelStatusHandler>();
	const seenMessages = new Set<string>();
	let controller: AbortController | undefined;
	let stopping = false;

	function emitStatus(update: ChannelStatusUpdate): void {
		for (const handler of statusHandlers) handler(update);
	}

	async function rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
		const response = await fetch(`${baseUrl}/api/v1/rpc`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: randomUUID(),
				method,
				params: { account: accountId, ...params },
			}),
		});
		if (!response.ok) throw new Error(`Signal RPC failed: ${response.status}`);
		const payload = (await response.json()) as { result?: unknown; error?: { message?: string } };
		if (payload.error) throw new Error(payload.error.message ?? 'Signal RPC failed');
		return payload.result;
	}

	async function loadAttachment(attachment: SignalAttachment) {
		if (!attachment.id) throw new Error('Signal voice attachment has no id');
		const result = await rpc('getAttachment', { id: attachment.id });
		const data =
			typeof result === 'string'
				? result
				: typeof result === 'object' && result !== null && 'data' in result
					? String((result as { data: unknown }).data)
					: '';
		if (!data) throw new Error('Signal attachment response contained no data');
		return {
			data,
			encoding: 'base64' as const,
			mimeType: attachment.contentType ?? 'audio/m4a',
			fileName: attachment.filename ?? 'voice.m4a',
			byteLength: attachment.size,
		};
	}

	function handleEvent(event: SignalReceive): void {
		if (event.method !== 'receive') return;
		const envelope = event.params?.envelope ?? event.params?.result?.envelope;
		const data = envelope?.dataMessage;
		if (!envelope || !data) return;
		const source = envelope.sourceNumber ?? envelope.source ?? envelope.sourceUuid ?? '';
		const timestamp = data.timestamp ?? envelope.timestamp ?? Date.now();
		const groupId = data.groupInfo?.groupId;
		const chatId = groupId ?? source;
		const messageId = String(timestamp);
		const idempotencyKey = ['signal', accountId, chatId, messageId].join(':');
		if (!source || !chatId || seenMessages.has(idempotencyKey)) return;
		const voice = data.attachments?.find((attachment) =>
			attachment.contentType?.startsWith('audio/')
		);
		if (!data.message?.trim() && !voice) return;
		seenMessages.add(idempotencyKey);
		const message: ChannelInboundMessage = {
			channel: 'signal',
			accountId,
			senderId: source,
			senderName: envelope.sourceName,
			chatId,
			chatType: groupId ? 'group' : 'dm',
			messageId,
			content: voice
				? {
						type: 'voice',
						voice: {
							mimeType: voice.contentType ?? 'audio/m4a',
							fileName: voice.filename,
							byteLength: voice.size,
							load: () => loadAttachment(voice),
						},
					}
				: { type: 'text', text: data.message ?? '' },
			idempotencyKey,
			receivedAt: timestamp,
		};
		for (const handler of messageHandlers) handler(message);
	}

	async function consumeEvents(signal: AbortSignal): Promise<void> {
		const response = await fetch(`${baseUrl}/api/v1/events`, {
			headers: { accept: 'text/event-stream' },
			signal,
		});
		if (!response.ok || !response.body) {
			throw new Error(`Signal event stream failed: ${response.status}`);
		}
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		while (!signal.aborted) {
			const chunk = await reader.read();
			if (chunk.done) break;
			buffer += decoder.decode(chunk.value, { stream: true });
			let boundary = buffer.indexOf('\n\n');
			while (boundary >= 0) {
				const block = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				const json = block
					.split(/\r?\n/)
					.filter((line) => line.startsWith('data:'))
					.map((line) => line.slice(5).trimStart())
					.join('\n');
				if (json) {
					try {
						handleEvent(JSON.parse(json) as SignalReceive);
					} catch (error) {
						if (!(error instanceof SyntaxError)) throw error;
					}
				}
				boundary = buffer.indexOf('\n\n');
			}
		}
	}

	async function runEvents(): Promise<void> {
		while (!stopping) {
			controller = new AbortController();
			try {
				await consumeEvents(controller.signal);
			} catch (error) {
				if (stopping) return;
				emitStatus({
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
				});
			}
			if (!stopping) {
				emitStatus({ status: 'connecting' });
				await new Promise((resolve) => setTimeout(resolve, SIGNAL_RECONNECT_DELAY_MS));
			}
		}
	}

	async function send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt> {
		const params: Record<string, unknown> =
			message.chatType === 'group'
				? { groupId: message.to }
				: { recipient: [message.to] };
		if (message.content.type === 'voice') {
			params.message = '';
			params.attachment = `data:${message.content.voice.mimeType};base64,${message.content.voice.data}`;
			params.voiceNote = true;
		} else {
			params.message = message.content.text;
		}
		const result = (await rpc('send', params)) as { timestamp?: number } | undefined;
		const platformMessageId = result?.timestamp ? String(result.timestamp) : undefined;
		return {
			channel: message.channel,
			accountId: message.accountId,
			to: message.to,
			status: 'sent',
			platformMessageIds: platformMessageId ? [platformMessageId] : [],
			parts: [{ platformMessageId, timestamp: Date.now() }],
			sentAt: Date.now(),
		};
	}

	return {
		async start() {
			stopping = false;
			emitStatus({ status: 'connecting' });
			const response = await fetch(`${baseUrl}/api/v1/check`);
			if (!response.ok) throw new Error(`Signal daemon health check failed: ${response.status}`);
			emitStatus({ status: 'connected' });
			void runEvents();
		},
		async stop() {
			stopping = true;
			controller?.abort();
			emitStatus({ status: 'disconnected' });
		},
		send,
		onMessage(handler) {
			messageHandlers.add(handler);
			return () => messageHandlers.delete(handler);
		},
		onStatus(handler) {
			statusHandlers.add(handler);
			return () => statusHandlers.delete(handler);
		},
	};
}
