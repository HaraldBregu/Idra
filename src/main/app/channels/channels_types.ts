import type { ChannelConnectionStatus, ChannelType } from '../../../shared';

export type ChannelChatType = 'dm' | 'group' | 'channel' | 'thread';

export interface ChannelInboundMessage {
	channel: ChannelType;
	accountId: string;
	senderId: string;
	senderName?: string;
	chatId: string;
	chatType: ChannelChatType;
	messageId: string;
	threadId?: string;
	text: string;
	idempotencyKey: string;
	receivedAt: number;
}

export interface ChannelOutboundMessage {
	channel: ChannelType;
	to: string;
	text: string;
	accountId?: string;
	threadId?: string;
	replyToMessageId?: string;
	idempotencyKey?: string;
}

export interface ChannelDeliveryPart {
	platformMessageId?: string;
	timestamp: number;
}

export interface ChannelMessageReceipt {
	channel: ChannelType;
	accountId?: string;
	to: string;
	status: 'sent' | 'partial' | 'failed';
	platformMessageIds: string[];
	parts: ChannelDeliveryPart[];
	error?: string;
	sentAt: number;
}

export interface ChannelStatusUpdate {
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
}

export type ChannelInboundHandler = (message: ChannelInboundMessage) => void;
export type ChannelStatusHandler = (update: ChannelStatusUpdate) => void;

export interface ChannelAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
	onMessage(handler: ChannelInboundHandler): () => void;
	onStatus(handler: ChannelStatusHandler): () => void;
}
