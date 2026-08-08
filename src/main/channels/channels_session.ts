import { v5 as uuidv5 } from 'uuid';
import type { ChannelInboundMessage } from './channels_types';

const CHANNEL_SESSION_NAMESPACE = '3f3a2cb1-8944-4a2f-9571-a3e17d96b40b';

export function channelSessionId(
	message: Pick<ChannelInboundMessage, 'channel' | 'accountId' | 'chatId' | 'threadId'>
): string {
	return uuidv5(
		JSON.stringify([message.channel, message.accountId, message.chatId, message.threadId ?? null]),
		CHANNEL_SESSION_NAMESPACE
	);
}
