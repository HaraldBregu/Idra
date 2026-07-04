export { createChannelRegistry } from './registry';
export type { ChannelRegistry, ChannelRegistryDependencies } from './registry';
export {
	deleteChannelConfig,
	getChannelConfig,
	getChannels,
	listConfiguredChannels,
	setChannelConfig,
	setChannelProperties,
} from './store';
export { canReceive } from './security';
export type { ChannelSecurityDecision } from './security';
export { sendDurableMessageBatch } from './batch';
export type {
	ChannelAdapter,
	ChannelChatType,
	ChannelDeliveryPart,
	ChannelInboundHandler,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelOutboundMessage,
	ChannelStatusHandler,
	ChannelStatusUpdate,
} from './types';
export type { TelegramAdapterOptions } from './telegram/types';
export type { DiscordAdapterOptions } from './discord/types';
