import type { ChannelConnectionStatus, ChannelType } from '../../shared/channels';

export type ChannelChatType = 'dm' | 'group' | 'channel' | 'thread';
export type ChannelAckPolicy = 'after_receive' | 'after_dispatch' | 'after_delivery' | 'manual';
export type ChannelReplyMode = 'off' | 'first' | 'all' | 'batched';

export interface ChannelMetadata {
	name: string;
	description: string;
	version?: string;
}

export interface ChannelCapabilities {
	inbound: boolean;
	outbound: boolean;
	text: boolean;
	media: boolean;
	voice: boolean;
	polls: boolean;
	receipts: boolean;
	threading: boolean;
	groups: boolean;
	setup: boolean;
	longRunningGateway: boolean;
}

export interface ChannelAccountSnapshot {
	id: string;
	label: string;
	enabled: boolean;
	configured: boolean;
	defaultTargetId?: string;
	allowFrom: string[];
}

export interface ChannelConfigAdapter<TConfig = unknown> {
	listAccounts(config: TConfig): ChannelAccountSnapshot[];
	resolveAccount(config: TConfig, accountId?: string): ChannelAccountSnapshot | null;
	inspectAccount(config: TConfig, accountId?: string): ChannelAccountSnapshot | null;
	getDefaultAccount(config: TConfig): ChannelAccountSnapshot | null;
	isEnabled(config: TConfig, accountId?: string): boolean;
	isConfigured(config: TConfig, accountId?: string): boolean;
	getAllowlist(config: TConfig, accountId?: string): string[];
	getDefaultTarget(config: TConfig, accountId?: string): string | null;
}

export interface ChannelSetupResult<TConfig = unknown> {
	config: TConfig;
	warnings: string[];
}

export interface ChannelSetupAdapter<TInput = unknown, TConfig = unknown> {
	validate(input: TInput): string[];
	apply(current: TConfig, input: TInput): ChannelSetupResult<TConfig>;
}

export interface ChannelSecurityDecision {
	allowed: boolean;
	reason?: string;
}

export interface ChannelSecurityAdapter {
	canReceive(
		message: ChannelNormalizedInboundMessage,
		account: ChannelAccountSnapshot
	): ChannelSecurityDecision;
}

export interface ChannelNormalizedInboundMessage {
	channelId: ChannelType;
	accountId: string;
	senderId: string;
	senderName?: string;
	targetId: string;
	chatType: ChannelChatType;
	messageId: string;
	threadId?: string;
	text: string;
	media: ChannelInboundMedia[];
	provenance: Record<string, unknown>;
	idempotencyKey: string;
	receivedAt: number;
}

export interface ChannelInboundMedia {
	id: string;
	kind: 'image' | 'video' | 'audio' | 'file';
	mimeType?: string;
	sizeBytes?: number;
	url?: string;
}

export interface ChannelInboundMessage {
	type: ChannelType;
	accountId?: string;
	from: string;
	chatId: string;
	text: string;
	messageId?: string;
	threadId?: string;
	chatType?: ChannelChatType;
	provenance?: Record<string, unknown>;
}

export interface ChannelOutboundMessage {
	type: ChannelType;
	to: string;
	text: string;
	accountId?: string;
	threadId?: string;
	replyToMessageId?: string;
	idempotencyKey?: string;
}

export interface ChannelStatusUpdate {
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
}

export type ChannelInboundHandler = (message: ChannelInboundMessage) => void;
export type ChannelStatusHandler = (update: ChannelStatusUpdate) => void;

export interface ChannelDeliveryPart {
	kind: 'text' | 'media' | 'payload' | 'poll';
	platformMessageId?: string;
	threadId?: string;
	replyToMessageId?: string;
	timestamp: number;
	raw?: unknown;
}

export interface ChannelMessageReceipt {
	channelId: ChannelType;
	accountId?: string;
	targetId: string;
	idempotencyKey?: string;
	status: 'sent' | 'partial' | 'failed';
	parts: ChannelDeliveryPart[];
	error?: string;
	timestamp: number;
}

export interface ChannelOutboundAdapter {
	send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
}

export interface ChannelGatewayAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	onMessage(handler: ChannelInboundHandler): () => void;
	onStatus(handler: ChannelStatusHandler): () => void;
	getStatus?(): ChannelStatusUpdate;
}

export interface ChannelThreadingAdapter {
	getSessionKey(message: ChannelNormalizedInboundMessage): string;
	resolveReplyTarget(
		message: ChannelInboundMessage
	): Pick<ChannelOutboundMessage, 'to' | 'threadId' | 'replyToMessageId'>;
	replyMode: ChannelReplyMode;
}

export interface ChannelDoctorIssue {
	severity: 'info' | 'warning' | 'error';
	message: string;
}

export interface ChannelDoctorAdapter<TConfig = unknown> {
	inspect(config: TConfig): ChannelDoctorIssue[];
}

export interface ChannelPlugin<TConfig = unknown, TSetupInput = unknown> {
	id: ChannelType;
	meta: ChannelMetadata;
	capabilities: ChannelCapabilities;
	config: ChannelConfigAdapter<TConfig>;
	setup?: ChannelSetupAdapter<TSetupInput, TConfig>;
	security?: ChannelSecurityAdapter;
	gateway?: ChannelGatewayAdapter;
	outbound?: ChannelOutboundAdapter;
	threading?: ChannelThreadingAdapter;
	doctor?: ChannelDoctorAdapter<TConfig>;
	envVars?: string[];
}

export interface ChannelAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	send(message: ChannelOutboundMessage): Promise<void>;
	deliver?(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
	onMessage(handler: ChannelInboundHandler): () => void;
	onStatus(handler: ChannelStatusHandler): () => void;
}
