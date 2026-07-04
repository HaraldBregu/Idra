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
export { createTelegramAdapter } from './telegram';
export type { TelegramAdapterOptions } from './telegram';
export { createDiscordAdapter } from './discord';
export type { DiscordAdapterOptions } from './discord';
