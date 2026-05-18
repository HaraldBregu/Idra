import type { ChannelType } from './channels';

export const HEARTBEAT_OK = 'HEARTBEAT_OK';

export interface HeartbeatActiveHoursConfig {
	start?: string;
	end?: string;
	timezone?: string;
}

export type HeartbeatTarget = 'none' | 'last' | ChannelType | string;
export type HeartbeatDirectPolicy = 'allow' | 'block';

export interface AgentHeartbeatConfig {
	every?: string;
	activeHours?: HeartbeatActiveHoursConfig;
	model?: string;
	session?: 'main' | 'global' | string;
	target?: HeartbeatTarget;
	directPolicy?: HeartbeatDirectPolicy;
	to?: string;
	accountId?: string;
	prompt?: string;
	includeSystemPromptSection?: boolean;
	ackMaxChars?: number;
	suppressToolErrorWarnings?: boolean;
	timeoutSeconds?: number;
	lightContext?: boolean;
	isolatedSession?: boolean;
	skipWhenBusy?: boolean;
	includeReasoning?: boolean;
}

export interface AgentHeartbeatListEntry {
	id: string;
	heartbeat?: AgentHeartbeatConfig;
}

export interface AgentsHeartbeatConfig {
	defaultAgentId?: string;
	defaults?: {
		userTimezone?: string;
		heartbeat?: AgentHeartbeatConfig;
	};
	list?: AgentHeartbeatListEntry[];
}

export type HeartbeatWakeSource =
	| 'interval'
	| 'manual'
	| 'exec-event'
	| 'notifications-event'
	| 'cron'
	| 'hook'
	| 'background-task'
	| 'background-task-blocked'
	| 'acp-spawn'
	| 'cli-watchdog'
	| 'restart-sentinel'
	| 'retry'
	| 'other';

export type HeartbeatWakeIntent = 'scheduled' | 'event' | 'immediate' | 'manual';

export interface HeartbeatWakeOverride {
	target?: HeartbeatTarget;
	to?: string;
	accountId?: string;
}

export interface HeartbeatWakeRequest {
	source: HeartbeatWakeSource;
	intent: HeartbeatWakeIntent;
	reason?: string;
	agentId?: string;
	sessionKey?: string;
	heartbeat?: HeartbeatWakeOverride;
	coalesceMs?: number;
}

export type HeartbeatRunResult =
	| { status: 'ran'; durationMs: number }
	| { status: 'skipped'; reason: string }
	| { status: 'failed'; reason: string };

export type HeartbeatEventStatus = 'sent' | 'ok-empty' | 'ok-token' | 'skipped' | 'failed';
export type HeartbeatIndicatorType = 'ok' | 'alert' | 'error';

export interface HeartbeatEventPayload {
	timestamp: number;
	status: HeartbeatEventStatus;
	channel?: string;
	target?: string;
	accountId?: string;
	preview?: string;
	durationMs?: number;
	hasMedia?: boolean;
	reason?: string;
	silent?: boolean;
	indicatorType?: HeartbeatIndicatorType;
}

export interface HeartbeatTaskStateRecord {
	lastRunMs: number;
}

export interface HeartbeatDeliveredTextRecord {
	text: string;
	atMs: number;
}

export interface HeartbeatStoreState {
	version: 1;
	taskState: Record<string, HeartbeatTaskStateRecord>;
	lastDelivered: Record<string, HeartbeatDeliveredTextRecord>;
}

export interface HeartbeatStatus {
	enabled: boolean;
	runnerActive: boolean;
	agentCount: number;
	nextDueMs?: number;
	lastHeartbeat: HeartbeatEventPayload | null;
}

export interface HeartbeatSetEnabledRequest {
	enabled: boolean;
}

export interface HeartbeatSystemEventRequest {
	text: string;
	mode?: 'now' | 'next-heartbeat';
	agentId?: string;
	sessionKey?: string;
	heartbeat?: HeartbeatWakeOverride;
}

export interface HeartbeatSystemEventResult {
	queued: true;
	sessionKey: string;
	mode: 'now' | 'next-heartbeat';
}
