import type {
	ChannelDeliveryPart,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
} from './channels_types';

export async function sendDurableMessageBatch(
	message: ChannelOutboundMessage,
	sendPart: (text: string) => Promise<ChannelDeliveryPart>,
	options: { maxLength: number }
): Promise<ChannelMessageReceipt> {
	if (message.content.type !== 'text') {
		throw new Error('Text batch requires text content');
	}
	const parts = splitText(message.content.text, options.maxLength);
	const delivered: ChannelDeliveryPart[] = [];
	let error: string | undefined;

	for (const part of parts) {
		try {
			delivered.push(await sendPart(part));
		} catch (caught) {
			error = caught instanceof Error ? caught.message : String(caught);
			break;
		}
	}

	return {
		channel: message.channel,
		accountId: message.accountId,
		to: message.to,
		status: error ? (delivered.length > 0 ? 'partial' : 'failed') : 'sent',
		platformMessageIds: delivered
			.map((part) => part.platformMessageId)
			.filter((id): id is string => Boolean(id)),
		parts: delivered,
		error,
		sentAt: Date.now(),
	};
}

function splitText(text: string, maxLength: number): string[] {
	if (text.length === 0) return [''];
	const chunks: string[] = [];
	for (let index = 0; index < text.length; index += maxLength) {
		chunks.push(text.slice(index, index + maxLength));
	}
	return chunks;
}
