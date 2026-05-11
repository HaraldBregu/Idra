import type { ChannelConnectionStatus, ChannelType } from '../../shared/channels';

export interface ChannelInboundMessage {
	type: ChannelType;
	from: string;
	chatId: string;
	text: string;
}

export interface ChannelOutboundMessage {
	type: ChannelType;
	to: string;
	text: string;
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
	send(message: ChannelOutboundMessage): Promise<void>;
	onMessage(handler: ChannelInboundHandler): () => void;
	onStatus(handler: ChannelStatusHandler): () => void;
}
