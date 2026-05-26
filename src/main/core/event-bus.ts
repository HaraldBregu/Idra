import { BrowserWindow } from 'electron';
import type { SubagentRunRecord } from '../agent';
import type { TaskEvent } from '../../shared/tasks';

type TaskEventOf<TType extends TaskEvent['type']> = Extract<TaskEvent, { type: TType }>;

/**
 * Base event structure for main process events
 */
export interface AppEvent {
	type: string;
	payload: unknown;
	timestamp: number;
}

/**
 * Typed events for cross-cutting concerns in the main process.
 * Used for analytics, logging, and monitoring.
 */
export interface AppEvents {
	'service:initialized': { service: string };
	'service:destroyed': { service: string };
	'error:critical': { error: Error; context: string };
	'window:created': { windowId: number; type: string };
	'window:closed': { windowId: number };
	'task:created': TaskEventOf<'task:created'>;
	'task:started': TaskEventOf<'task:started'>;
	'task:updated': TaskEventOf<'task:updated'>;
	'task:succeeded': TaskEventOf<'task:succeeded'>;
	'task:failed': TaskEventOf<'task:failed'>;
	'task:cancelled': TaskEventOf<'task:cancelled'>;
	'subagent:created': SubagentRunRecord;
	'subagent:started': SubagentRunRecord;
	'subagent:completed': SubagentRunRecord;
	'tray:set-enabled': { enabled: boolean };
	'channel:status': import('../../shared/channels').ChannelStatusEvent;
	'channel:route': {
		channel: import('../../shared/channels').ChannelType;
		accountId?: string;
		to: string;
		threadId?: string;
		replyToMessageId?: string;
		chatType?: import('../channels').ChannelChatType;
		sessionKey?: string;
		legacySessionKey?: string;
		agentId?: string;
	};
	'heartbeat:event': import('../../shared/heartbeat').HeartbeatEventPayload;
}

/**
 * Centralized event bus for both Main -> Renderer and Main Process events.
 *
 * - broadcast() and sendTo(): For Main -> Renderer IPC communication
 * - emit() and on(): For typed Main Process events (analytics, logging, monitoring)
 */
export class EventBus {
	private mainProcessListeners = new Map<string, Set<(event: AppEvent) => void>>();
	/**
	 * Broadcast a message to all open renderer windows.
	 */
	broadcast(channel: string, ...args: unknown[]): void {
		BrowserWindow.getAllWindows().forEach((win) => {
			if (!win.isDestroyed()) {
				win.webContents.send(channel, ...args);
			}
		});
	}

	/**
	 * Send a message to a specific window.
	 */
	sendTo(windowId: number, channel: string, ...args: unknown[]): void {
		const win = BrowserWindow.fromId(windowId);
		if (win && !win.isDestroyed()) {
			win.webContents.send(channel, ...args);
		}
	}

	/**
	 * Emit a typed event within the main process.
	 * Used for cross-cutting concerns like analytics, logging, and monitoring.
	 *
	 * @param type - The event type (must be a key in AppEvents)
	 * @param payload - The event payload (typed based on event type)
	 */
	emit<K extends keyof AppEvents>(type: K, payload: AppEvents[K]): void {
		const event: AppEvent = {
			type,
			payload,
			timestamp: Date.now(),
		};

		this.mainProcessListeners.get(type)?.forEach((callback) => {
			try {
				callback(event);
			} catch (err) {
				console.error(`[EventBus] Listener error for ${type}:`, err);
			}
		});
	}

	/**
	 * Subscribe to a typed event within the main process.
	 * Returns an unsubscribe function to remove the listener.
	 *
	 * @param type - The event type to listen for
	 * @param callback - Function to call when the event is emitted
	 * @returns Unsubscribe function
	 */
	on<K extends keyof AppEvents>(type: K, callback: (event: AppEvent) => void): () => void {
		if (!this.mainProcessListeners.has(type)) {
			this.mainProcessListeners.set(type, new Set());
		}
		this.mainProcessListeners.get(type)!.add(callback);

		return () => {
			this.mainProcessListeners.get(type)?.delete(callback);
		};
	}

	/**
	 * Remove all listeners for a specific event type.
	 * Useful for cleanup during service shutdown.
	 */
	off<K extends keyof AppEvents>(type: K): void {
		this.mainProcessListeners.delete(type);
	}

	/**
	 * Clear all main process event listeners.
	 * Should be called during application shutdown.
	 */
	clearAllListeners(): void {
		this.mainProcessListeners.clear();
	}
}
