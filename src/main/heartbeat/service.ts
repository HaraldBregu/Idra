import type {
	HeartbeatEventPayload,
	HeartbeatSetEnabledRequest,
	HeartbeatSetModelRequest,
	HeartbeatSetProviderRequest,
	HeartbeatSetReasoningEffortRequest,
	HeartbeatSettings,
	HeartbeatSettingsUpdate,
	HeartbeatStatus,
	HeartbeatSystemEventRequest,
	HeartbeatSystemEventResult,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../../shared/heartbeat';
import {
	ElectronStoreHeartbeatStore,
	type HeartbeatStore,
	normalizeHeartbeatSettings,
} from './store';

const SCOPE = 'HeartbeatService';

interface HeartbeatLogger {
	debug?(scope: string, message: string, metadata?: unknown): void;
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
	error(scope: string, message: string, metadata?: unknown): void;
}

export type HeartbeatEventListener = (event: HeartbeatEventPayload) => void;

export interface HeartbeatServiceEvents {
	subscribe(listener: HeartbeatEventListener): () => void;
}

export interface HeartbeatServiceOptions {
	store?: HeartbeatStore;
}

/**
 * Stores and serves heartbeat configuration for the settings UI.
 *
 * NOTE: the periodic wake runner is not yet implemented. Settings, timing,
 * provider/model selection, and the enabled flag are fully persisted, but
 * {@link HeartbeatService.request} and {@link HeartbeatService.systemEvent}
 * only record the intent (no agent is actually woken yet), and the reported
 * status always has `runnerActive: false`. Wiring the runner is a follow-up.
 */
export class HeartbeatService {
	private readonly logger: HeartbeatLogger;
	private readonly store: HeartbeatStore;
	private readonly listeners = new Set<HeartbeatEventListener>();

	constructor(logger: HeartbeatLogger, options: HeartbeatServiceOptions = {}) {
		this.logger = logger;
		this.store = options.store ?? new ElectronStoreHeartbeatStore();
	}

	get events(): HeartbeatServiceEvents {
		return {
			subscribe: (listener: HeartbeatEventListener): (() => void) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			},
		};
	}

	getStatus(): HeartbeatStatus {
		const state = this.store.read();
		return {
			enabled: state.enabled,
			runnerActive: false,
			agentCount: 0,
			lastHeartbeat: state.lastHeartbeat,
		};
	}

	getLast(): HeartbeatEventPayload | null {
		return this.store.read().lastHeartbeat;
	}

	getSettings(): HeartbeatSettings {
		return this.store.read().settings;
	}

	saveSettings(update: HeartbeatSettingsUpdate): HeartbeatSettings {
		const state = this.store.write((draft) => {
			draft.settings = normalizeHeartbeatSettings({ ...draft.settings, ...update });
		});
		return state.settings;
	}

	setEnabled(request: HeartbeatSetEnabledRequest): HeartbeatStatus {
		this.store.write((draft) => {
			draft.enabled = request.enabled === true;
		});
		this.logger.info(SCOPE, `Heartbeat ${request.enabled ? 'enabled' : 'disabled'}`);
		return this.getStatus();
	}

	getTiming(): HeartbeatTimingSettings {
		const { every, activeHours } = this.store.read().settings;
		return activeHours ? { every, activeHours } : { every };
	}

	updateTiming(timing: HeartbeatTimingSettings): HeartbeatTimingSettings {
		this.store.write((draft) => {
			draft.settings = normalizeHeartbeatSettings({
				...draft.settings,
				every: timing.every,
				activeHours: timing.activeHours,
			});
		});
		return this.getTiming();
	}

	setProviderId(request: HeartbeatSetProviderRequest): HeartbeatSettings {
		return this.saveSettings({ providerId: request.providerId });
	}

	setModelId(request: HeartbeatSetModelRequest): HeartbeatSettings {
		return this.saveSettings({ modelId: request.modelId });
	}

	setReasoningEffort(request: HeartbeatSetReasoningEffortRequest): HeartbeatSettings {
		return this.saveSettings({ reasoningEffort: request.reasoningEffort });
	}

	systemEvent(request: HeartbeatSystemEventRequest): HeartbeatSystemEventResult {
		const text = typeof request.text === 'string' ? request.text.trim() : '';
		if (!text) throw new Error('Heartbeat system event requires non-empty text.');
		const mode = request.mode === 'now' ? 'now' : 'next-heartbeat';
		const sessionKey = request.sessionKey?.trim() || request.agentId?.trim() || 'main';
		// Runner not yet implemented: log so a queued event is observable, not lost.
		this.logger.info(SCOPE, `System event queued (${mode})`, { sessionKey });
		return { queued: true, sessionKey, mode };
	}

	request(request: HeartbeatWakeRequest): void {
		// Runner not yet implemented: record the wake request for observability only.
		this.logger.info(SCOPE, `Wake requested (${request.intent}/${request.source})`, {
			reason: request.reason,
			agentId: request.agentId,
		});
	}
}
