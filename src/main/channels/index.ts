export { ChannelRegistry } from './registry';
export { TelegramAdapter } from './telegram';
export { createChannelPluginBase, defineChannelPluginEntry } from './plugin';
export { sendDurableMessageBatch } from './message';
export type {
	ChannelAdapter,
	ChannelAccountSnapshot,
	ChannelCapabilities,
	ChannelConfigAdapter,
	ChannelDeliveryPart,
	ChannelDoctorAdapter,
	ChannelGatewayAdapter,
	ChannelInboundHandler,
	ChannelInboundMedia,
	ChannelInboundMessage,
	ChannelMessageReceipt,
	ChannelMetadata,
	ChannelNormalizedInboundMessage,
	ChannelOutboundAdapter,
	ChannelOutboundMessage,
	ChannelPlugin,
	ChannelSecurityAdapter,
	ChannelSetupAdapter,
	ChannelStatusHandler,
	ChannelStatusUpdate,
	ChannelThreadingAdapter,
} from './types';
export type { ChannelRegistryDependencies, ChannelRegistryOptions } from './registry';
