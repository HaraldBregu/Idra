import type { ChannelDeliveryPart, ChannelMessageReceipt, ChannelOutboundMessage } from './types';

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
			parts: delivered,
			timestamp: Date.now(),
		};
	} catch (error) {
		return {
			channelId: message.type,
			accountId: message.accountId,
			targetId: message.to,
			idempotencyKey: message.idempotencyKey,
			status: delivered.length > 0 ? 'partial' : 'failed',
			parts: delivered,
			error: error instanceof Error ? error.message : String(error),
			timestamp: Date.now(),
		};
	}
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
