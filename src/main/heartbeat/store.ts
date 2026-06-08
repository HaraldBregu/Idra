import Store from 'electron-store';
import type {
	HeartbeatActiveHoursConfig,
	HeartbeatEventPayload,
	HeartbeatSettings,
} from '../../shared/heartbeat';

export const HEARTBEAT_STORE_SCHEMA_VERSION = 1 as const;

/**
 * Default heartbeat cadence used when no settings have been persisted yet.
 */
export const DEFAULT_HEARTBEAT_SETTINGS: HeartbeatSettings = {
	every: '15m',
};

/**
 * Persisted heartbeat state. Keeps the user-facing configuration (enabled flag
 * and settings) plus the most recent heartbeat event so the settings page can
 * render a status without a live runner.
 */
export interface HeartbeatPersistedState {
	version: typeof HEARTBEAT_STORE_SCHEMA_VERSION;
	enabled: boolean;
	settings: HeartbeatSettings;
	lastHeartbeat: HeartbeatEventPayload | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function emptyHeartbeatState(): HeartbeatPersistedState {
	return {
		version: HEARTBEAT_STORE_SCHEMA_VERSION,
		enabled: false,
		settings: { ...DEFAULT_HEARTBEAT_SETTINGS },
		lastHeartbeat: null,
	};
}

function normalizeActiveHours(value: unknown): HeartbeatActiveHoursConfig | undefined {
	if (!isRecord(value)) return undefined;
	const activeHours: HeartbeatActiveHoursConfig = {};
	if (typeof value.start === 'string' && value.start.trim()) activeHours.start = value.start.trim();
	if (typeof value.end === 'string' && value.end.trim()) activeHours.end = value.end.trim();
	if (typeof value.timezone === 'string' && value.timezone.trim()) activeHours.timezone = value.timezone.trim();
	return Object.keys(activeHours).length > 0 ? activeHours : undefined;
}

function normalizeSettings(value: unknown): HeartbeatSettings {
	const raw = isRecord(value) ? value : {};
	const next: HeartbeatSettings = {
		every:
			typeof raw.every === 'string' && raw.every.trim()
				? raw.every.trim()
				: DEFAULT_HEARTBEAT_SETTINGS.every,
	};
	const activeHours = normalizeActiveHours(raw.activeHours);
	if (activeHours) next.activeHours = activeHours;
	if (typeof raw.providerId === 'string' && raw.providerId) next.providerId = raw.providerId;
	if (typeof raw.modelId === 'string' && raw.modelId) next.modelId = raw.modelId;
	if (typeof raw.reasoningEffort === 'string' && raw.reasoningEffort) {
		next.reasoningEffort = raw.reasoningEffort as HeartbeatSettings['reasoningEffort'];
	}
	return next;
}

/**
 * Coerce arbitrary persisted/incoming data into a valid {@link HeartbeatPersistedState}.
 * Unknown or malformed fields fall back to defaults.
 */
export function migrateHeartbeatState(raw: unknown): HeartbeatPersistedState {
	if (!isRecord(raw)) return emptyHeartbeatState();
	return {
		version: HEARTBEAT_STORE_SCHEMA_VERSION,
		enabled: raw.enabled === true,
		settings: normalizeSettings(raw.settings),
		lastHeartbeat: isRecord(raw.lastHeartbeat)
			? (clone(raw.lastHeartbeat) as HeartbeatEventPayload)
			: null,
	};
}

export { normalizeSettings as normalizeHeartbeatSettings };

export interface HeartbeatStore {
	read(): HeartbeatPersistedState;
	write(mutate: (state: HeartbeatPersistedState) => void): HeartbeatPersistedState;
}

/**
 * In-memory store used for tests and non-Electron contexts.
 */
export class InMemoryHeartbeatStore implements HeartbeatStore {
	private state: HeartbeatPersistedState;

	constructor(initial?: Partial<HeartbeatPersistedState>) {
		this.state = migrateHeartbeatState({ ...emptyHeartbeatState(), ...initial });
	}

	read(): HeartbeatPersistedState {
		return clone(this.state);
	}

	write(mutate: (state: HeartbeatPersistedState) => void): HeartbeatPersistedState {
		const draft = clone(this.state);
		mutate(draft);
		this.state = migrateHeartbeatState(draft);
		return clone(this.state);
	}
}

/**
 * electron-store backed implementation used in the running app.
 */
export class ElectronStoreHeartbeatStore implements HeartbeatStore {
	private readonly store: Store<HeartbeatPersistedState>;

	constructor(store?: Store<HeartbeatPersistedState>) {
		this.store =
			store ??
			new Store<HeartbeatPersistedState>({
				name: 'heartbeat',
				accessPropertiesByDotNotation: false,
			});
	}

	read(): HeartbeatPersistedState {
		return migrateHeartbeatState(this.store.store);
	}

	write(mutate: (state: HeartbeatPersistedState) => void): HeartbeatPersistedState {
		const draft = this.read();
		mutate(draft);
		const migrated = migrateHeartbeatState(draft);
		this.store.store = migrated;
		return migrated;
	}
}
