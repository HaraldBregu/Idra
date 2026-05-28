import type {
	ChannelDeliveryPart,
	ChannelMessageAdapter,
	ChannelMessageReceipt,
	ChannelOutboundAdapter,
	ChannelOutboundMessage,
} from './types';

export async function sendDurableMessageBatch(
	message: ChannelOutboundMessage,
	sendPart: (text: string) => Promise<ChannelDeliveryPart>,
	options: { maxLength: number }
): Promise<ChannelMessageReceipt> {
	const parts = splitText(message.text, options.maxLength);
	const delivered: ChannelDeliveryPart[] = [];

	try {
		for (const part of parts) {
			delivered.push(await sendPart(part));
		}

		return {
			channelId: message.type,
			accountId: message.accountId,
			targetId: message.to,
			idempotencyKey: message.idempotencyKey,
			status: 'sent',
			primaryPlatformMessageId: getPrimaryPlatformMessageId(delivered),
			platformMessageIds: getPlatformMessageIds(delivered),
			parts: delivered,
			threadId: message.threadId,
			replyToId: message.replyToMessageId,
			sentAt: Date.now(),
			timestamp: Date.now(),
		};
	} catch (error) {
		return {
			channelId: message.type,
			accountId: message.accountId,
			targetId: message.to,
			idempotencyKey: message.idempotencyKey,
			status: delivered.length > 0 ? 'partial' : 'failed',
			primaryPlatformMessageId: getPrimaryPlatformMessageId(delivered),
			platformMessageIds: getPlatformMessageIds(delivered),
			parts: delivered,
			threadId: message.threadId,
			replyToId: message.replyToMessageId,
			sentAt: Date.now(),
			error: error instanceof Error ? error.message : String(error),
			timestamp: Date.now(),
		};
	}
}

export function defineChannelMessageAdapter(adapter: ChannelMessageAdapter): ChannelMessageAdapter {
	return adapter;
}

export function createChannelMessageAdapterFromOutbound(
	outbound: ChannelOutboundAdapter
): ChannelMessageAdapter {
	return {
		capabilities: ['text'],
		send: {
			text(message) {
				return outbound.send(message);
			},
		},
	};
}

function splitText(text: string, maxLength: number): string[] {
	if (text.length === 0) return [''];
	const chunks: string[] = [];
	let remaining = text;

	while (remaining.length > 0) {
		chunks.push(remaining.slice(0, maxLength));
		remaining = remaining.slice(maxLength);
	}

	return chunks;
}

function getPlatformMessageIds(parts: readonly ChannelDeliveryPart[]): string[] {
	return parts
		.map((part) => part.platformMessageId)
		.filter((id): id is string => Boolean(id));
}

function getPrimaryPlatformMessageId(parts: readonly ChannelDeliveryPart[]): string | undefined {
	return getPlatformMessageIds(parts)[0];
}
