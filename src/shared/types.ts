// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------
// Single source of truth for all data shapes used across IPC, models, and providers.
// Used by main, preload, and renderer.
//
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts.
// ---------------------------------------------------------------------------

// ---- AI Models & Providers -------------------------------------------------

export type ThemeVariant = 'light' | 'dark';
export type ThemeMode = ThemeVariant | 'system';

export interface ThemeData {
	readonly background: string;
	readonly foreground: string;
	readonly card: string;
	readonly 'card-foreground': string;
	readonly popover: string;
	readonly 'popover-foreground': string;
	readonly primary: string;
	readonly 'primary-foreground': string;
	readonly secondary: string;
	readonly 'secondary-foreground': string;
	readonly muted: string;
	readonly 'muted-foreground': string;
	readonly accent: string;
	readonly 'accent-foreground': string;
	readonly destructive: string;
	readonly 'destructive-foreground': string;
	readonly border: string;
	readonly input: string;
	readonly ring: string;
	readonly radius: string;
	readonly success: string;
	readonly 'success-foreground': string;
	readonly warning: string;
	readonly 'warning-foreground': string;
	readonly info: string;
	readonly 'info-foreground': string;
	readonly 'sidebar-background': string;
	readonly 'sidebar-foreground': string;
	readonly 'sidebar-primary': string;
	readonly 'sidebar-primary-foreground': string;
	readonly 'sidebar-accent': string;
	readonly 'sidebar-accent-foreground': string;
	readonly 'sidebar-border': string;
	readonly 'sidebar-ring': string;
}

/**
 * Full theme stored on disk at {userData}/themes/{folderName}/theme.json.
 * Contains metadata and color tokens for both light and dark variants.
 */
export interface Theme {
	readonly name: string;
	readonly description: string;
	readonly author: string;
	readonly version: string;
	readonly license: string;
	readonly light: ThemeData;
	readonly dark: ThemeData;
}

/**
 * Serializable theme metadata returned to the renderer over IPC.
 * `id` is the folder name on disk (serves as a stable identifier).
 */
export interface CustomThemeInfo {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly author: string;
	readonly version: string;
	readonly license: string;
}

/**
 * Information about a scheduled cron job.
 */
export interface CronJobInfo {
	readonly id: string;
	readonly expression: string;
}

/**
 * Tick event fired when a scheduled cron job runs.
 */
export interface CronTickEvent {
	readonly id: string;
	readonly firedAt: string;
}

/**
 * One model assignment inside an agent. The API key is not stored here — look
 * it up via the Service registered for `providerId`.
 */
export interface AgentSettings {
	id: string;
	name: string;
	models: {
		id: string;
		providerId: string;
		modelId: string;
	}[];
}

// ---- Logs -----------------------------------------------------------------

/** Serializable log entry passed over IPC to the renderer. */
export interface AppLogEntry {
	timestamp: string;
	level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
	source: string;
	message: string;
}

export interface UserProfile {
	firstName: string;
	lastName: string;
}

export interface AppStartupInfo {
	startupCount: number;
	isFirstRun: boolean;
	isInitialized: boolean;
}

// ---- Task -----------------------------------------------------------------

export type TaskPriority = 'low' | 'normal' | 'high';

export type TaskState = 'queued' | 'started' | 'running' | 'finished' | 'cancelled';

export interface TaskInfo {
	taskId: string;
	type: string;
	status: TaskState;
	priority: TaskPriority;
	startedAt?: number;
	completedAt?: number;
	windowId?: number;
	error?: string;
	durationMs?: number;
	metadata?: Record<string, unknown>;
	data?: string;
}

/** Queue metrics returned by task:queue-status */
export interface TaskQueueStatus {
	queued: number;
	running: number;
	completed: number;
}

/**
 * Flat task event shape.
 *
 * - `state`    — lifecycle stage.
 * - `taskId`   — unique identifier of the task.
 * - `data`     — typed result envelope for this state.
 * - `metadata` — caller-supplied metadata captured at submission time.
 */
export interface TaskEvent {
	state: TaskState;
	taskId: string;
	data: { success: true; data: string } | { success: false; error: string };
	metadata: Record<string, unknown>;
}

/**
 * Bundled arguments for the task:submit renderer API.
 * One object carries every submit-time property.
 */
export interface TaskAction<TInput = unknown> {
	type: string;
	input: TInput;
	metadata: Record<string, unknown>;
}

// ---- IPC Result

interface IpcError {
	success: false;
	error: {
		code: string;
		message: string;
		stack?: string;
	};
}

interface IpcSuccess<T> {
	success: true;
	data: T;
}

/**
 * Union type for IPC responses.
 */
export type IpcResult<T> = IpcSuccess<T> | IpcError;

// ---- Task Metadata

const TASK_STATUS_TEXT_KEY = 'statusText';

export function getTaskStatusText(metadata?: Record<string, unknown>): string | undefined {
	const value = metadata?.[TASK_STATUS_TEXT_KEY];
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

// ---- Channels (messaging adapters) -----------------------------------------

export interface TelegramChannelProperties {
	token: string;
	allowFrom: string[];
}

export interface WhatsappChannelProperties {
	/** E.164 phone number without the leading `+` (digits only). Empty = unconfigured. */
	phoneNumber: string;
	/** Pairing code returned by Baileys after `requestPairingCode`. Empty until first request. */
	token: string;
}

export interface DiscordChannelProperties {
	token: string;
	allowFrom: string[];
}

export interface Channel {
	telegram: TelegramChannelProperties;
	whatsapp: WhatsappChannelProperties;
	discord: DiscordChannelProperties;
}

export type ChannelType = keyof Channel;

export type ChannelConnectionStatus =
	| 'connecting'
	| 'pairing_code'
	| 'connected'
	| 'disconnected'
	| 'error';

export interface ChannelStatusEvent {
	type: ChannelType;
	status: ChannelConnectionStatus;
	pairingCode?: string;
	error?: string;
	timestamp: number;
}
export interface AssistantAiProvider {
	id: string;
	apiKey: string;
}

export interface AssistantAiSettings {
	providers: AssistantAiProvider[];
	selectedProvider: string;
	selectedModel: string;
}

export interface AssistantAiSelection {
	selectedProvider: string;
	selectedModel: string;
}
