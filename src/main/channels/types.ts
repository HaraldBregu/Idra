import type { ChannelConnectionStatus, ChannelDmPolicy, ChannelType } from '../../shared/channels';

export type ChannelChatType = 'dm' | 'group' | 'channel' | 'thread';
export type ChannelAckPolicy =
	| 'after_receive_record'
	| 'after_agent_dispatch'
	| 'after_durable_send'
	| 'after_receive'
	| 'after_dispatch'
	| 'after_delivery'
	| 'manual';
export type ChannelReplyMode = 'off' | 'first' | 'all' | 'batched';
export type ChannelAdmissionOutcome = 'dispatch' | 'observeOnly' | 'handled' | 'drop';
export type ChannelEventAuthMode =
	| 'inbound'
	| 'command'
	| 'origin-subject'
	| 'route-only'
	| 'none';
export type ChannelDeliveryCapability =
	| 'text'
	| 'media'
	| 'payload'
	| 'silent'
	| 'replyTo'
	| 'thread'
	| 'nativeQuote'
	| 'messageSendingHooks'
	| 'batch'
	| 'reconcileUnknownSend'
	| 'afterSendSuccess'
	| 'afterCommit';
export type ChannelLiveCapability =
	| 'draftPreview'
	| 'previewFinalization'
	| 'progressUpdates'
	| 'nativeStreaming'
	| 'quietFinalization';
export type ChannelPreviewFinalizerCapability =
	| 'finalEdit'
	| 'normalFallback'
	| 'discardPending'
	| 'previewReceipt'
	| 'retainOnAmbiguousFailure';

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
	durableDelivery?: readonly ChannelDeliveryCapability[];
	live?: readonly ChannelLiveCapability[];
	previewFinalizer?: readonly ChannelPreviewFinalizerCapability[];
	receiveAckPolicy?: ChannelAckPolicy;
}

export interface ChannelAccountSnapshot {
	id: string;
	label: string;
	enabled: boolean;
	configured: boolean;
	defaultTargetId?: string;
	allowFrom: string[];
	groupAllowFrom?: string[];
	dmPolicy?: ChannelDmPolicy;
	disabledReason?: string;
	unconfiguredReason?: string;
}

export interface ChannelConfigAdapter<TConfig = unknown> {
	listAccounts(config: TConfig): ChannelAccountSnapshot[];
	listAccountIds(config: TConfig): string[];
	resolveAccount(config: TConfig, accountId?: string): ChannelAccountSnapshot | null;
	inspectAccount(config: TConfig, accountId?: string): ChannelAccountSnapshot | null;
	describeAccount(config: TConfig, accountId?: string): ChannelAccountSnapshot | null;
	getDefaultAccount(config: TConfig): ChannelAccountSnapshot | null;
	defaultAccountId(config: TConfig): string | null;
	isEnabled(config: TConfig, accountId?: string): boolean;
	isConfigured(config: TConfig, accountId?: string): boolean;
	disabledReason(config: TConfig, accountId?: string): string | null;
	unconfiguredReason(config: TConfig, accountId?: string): string | null;
	getAllowlist(config: TConfig, accountId?: string): string[];
	resolveAllowFrom(config: TConfig, accountId?: string): string[];
	formatAllowFrom(config: TConfig, accountId?: string): string;
	getDefaultTarget(config: TConfig, accountId?: string): string | null;
	resolveDefaultTo(config: TConfig, accountId?: string): string | null;
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
	resolveDmPolicy?(
		account: ChannelAccountSnapshot,
		message?: ChannelNormalizedInboundMessage
	): ChannelDmPolicy;
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
	replyToId?: string;
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
	primaryPlatformMessageId?: string;
	platformMessageIds: string[];
	parts: ChannelDeliveryPart[];
	threadId?: string;
	replyToId?: string;
	editToken?: string;
	deleteToken?: string;
	sentAt: number;
	raw?: unknown;
	error?: string;
	timestamp: number;
}

export interface ChannelOutboundAdapter {
	send(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
}

export interface ChannelGatewayTask {
	completed: Promise<void>;
}

export interface ChannelGatewayAccountContext<TConfig = unknown, TAccount = ChannelAccountSnapshot> {
	cfg: TConfig;
	accountId: string;
	account: TAccount;
	runtime: unknown;
	logging: unknown;
	abortSignal: AbortSignal;
	getStatus(): ChannelStatusUpdate | undefined;
	setStatus(update: ChannelStatusUpdate): void;
	channelRuntime?: unknown;
}

export interface ChannelGatewayAdapter {
	start(): Promise<void>;
	stop(): Promise<void>;
	startAccount?(ctx: ChannelGatewayAccountContext): Promise<ChannelGatewayTask | void>;
	stopAccount?(ctx: ChannelGatewayAccountContext): Promise<void>;
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

export interface ChannelParsedTarget {
	channelId: ChannelType;
	targetId: string;
	accountId?: string;
	chatType?: ChannelChatType;
	threadId?: string;
	raw: string;
}

export interface ChannelConversationResolution {
	baseConversationId: string;
	threadId?: string;
	parentConversationCandidates: string[];
	deliveryTarget: string;
	sessionTarget: string;
}

export interface ChannelMessagingAdapter {
	targetPrefixes: readonly string[];
	normalizeTarget(target: string): string | null;
	parseExplicitTarget(target: string): ChannelParsedTarget | null;
	inferTargetChatType(target: string): ChannelChatType;
	resolveInboundConversation(message: ChannelNormalizedInboundMessage): ChannelConversationResolution;
	resolveSessionConversation(target: ChannelParsedTarget): ChannelConversationResolution;
	resolveDeliveryTarget(target: ChannelParsedTarget): string;
	resolveSessionTarget(target: ChannelParsedTarget): string;
	resolveOutboundSessionRoute(message: ChannelOutboundMessage): ChannelParsedTarget;
	targetResolver?(input: string): ChannelParsedTarget | null;
	formatTargetDisplay(target: ChannelParsedTarget): string;
	normalizeInbound?(
		message: ChannelInboundMessage,
		accountId: string
	): ChannelNormalizedInboundMessage | null;
}

export interface ChannelPreparedSendPayload {
	message: ChannelOutboundMessage;
	channelData: Record<string, unknown>;
}

export interface ChannelActionsAdapter {
	supportsAction(action: string): boolean;
	resolveExecutionMode?(action: string): 'local' | 'gateway';
	prepareSendPayload?(message: ChannelOutboundMessage): ChannelPreparedSendPayload;
	handleAction?(action: string, input: unknown): Promise<unknown>;
}

export interface ChannelMessageAdapter {
	capabilities: readonly ChannelDeliveryCapability[];
	send: {
		text?(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
		media?(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
		payload?(message: ChannelOutboundMessage): Promise<ChannelMessageReceipt>;
	};
}

export interface ChannelApprovalCapability {
	authorizeActorAction?(input: unknown): Promise<boolean> | boolean;
	getActionAvailabilityState?(input: unknown): unknown;
	getExecInitiatingSurfaceState?(input: unknown): unknown;
	resolveApproveCommandBehavior?(input: unknown): unknown;
	nativeRuntime?: unknown;
	render?(input: unknown): unknown;
	deliver?(input: unknown): Promise<unknown>;
}

export interface ChannelDirectoryAdapter {
	self?(): Promise<unknown> | unknown;
	listPeers?(): Promise<unknown[]> | unknown[];
	listPeersLive?(): AsyncIterable<unknown>;
	listGroups?(): Promise<unknown[]> | unknown[];
	listGroupsLive?(): AsyncIterable<unknown>;
	listGroupMembers?(groupId: string): Promise<unknown[]> | unknown[];
}

export interface ChannelResolverAdapter {
	resolveTargets(inputs: readonly string[], kind: 'peer' | 'group' | 'any'): Promise<unknown[]> | unknown[];
}

export interface ChannelHeartbeatAdapter {
	sendTyping(target: string): Promise<void> | void;
	clearTyping?(target: string): Promise<void> | void;
}

export interface ChannelBindingsAdapter {
	compileConfiguredBinding?(input: unknown): unknown;
	matchInboundConversation?(input: unknown): unknown;
	resolveCommandConversation?(input: unknown): unknown;
}

export interface ChannelConversationBindingsAdapter {
	supportsCurrentConversationBinding: boolean;
	defaultTopLevelPlacement?: 'dm' | 'group' | 'thread';
	resolveConversationRef?(input: unknown): unknown;
	buildBoundReplyPayload?(input: unknown): unknown;
	setIdleTimeoutBySessionKey?(sessionKey: string, timeoutMs: number): void;
	setMaxAgeBySessionKey?(sessionKey: string, maxAgeMs: number): void;
	createManager?(): unknown;
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
	configSchema?: unknown;
	setup?: ChannelSetupAdapter<TSetupInput, TConfig>;
	setupWizard?: unknown;
	security?: ChannelSecurityAdapter;
	allowlist?: unknown;
	pairing?: unknown;
	groups?: unknown;
	mentions?: unknown;
	gateway?: ChannelGatewayAdapter;
	outbound?: ChannelOutboundAdapter;
	message?: ChannelMessageAdapter;
	messaging?: ChannelMessagingAdapter;
	actions?: ChannelActionsAdapter;
	threading?: ChannelThreadingAdapter;
	status?: unknown;
	approvalCapability?: ChannelApprovalCapability;
	heartbeat?: ChannelHeartbeatAdapter;
	directory?: ChannelDirectoryAdapter;
	resolver?: ChannelResolverAdapter;
	lifecycle?: unknown;
	secrets?: unknown;
	doctor?: ChannelDoctorAdapter<TConfig>;
	bindings?: ChannelBindingsAdapter;
	conversationBindings?: ChannelConversationBindingsAdapter;
	agentPrompt?: unknown;
	streaming?: unknown;
	commands?: unknown;
	agentTools?: unknown;
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
