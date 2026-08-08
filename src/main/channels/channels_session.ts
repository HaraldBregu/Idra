import { createHash } from 'node:crypto';
import type { ChannelInboundMessage } from './channels_types';

const CHANNEL_SESSION_NAMESPACE = '3f3a2cb1-8944-4a2f-9571-a3e17d96b40b';

export function channelSessionId(
	message: Pick<ChannelInboundMessage, 'channel' | 'accountId' | 'chatId' | 'threadId'>
): string {
	const namespace = Buffer.from(CHANNEL_SESSION_NAMESPACE.replaceAll('-', ''), 'hex');
	const name = JSON.stringify([
		message.channel,
		message.accountId,
		message.chatId,
		message.threadId ?? null,
	]);
	const bytes = createHash('sha1').update(namespace).update(name).digest().subarray(0, 16);
	bytes[6] = (bytes[6] & 0x0f) | 0x50;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString('hex');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
