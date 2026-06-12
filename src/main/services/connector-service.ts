import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import { Service } from 'typedi';
import { ConnectorSettings, SIMPLE_CONNECTORS } from '../connector';
import type {
	ConnectorApprovalPolicy,
	ConnectorId,
	ConnectorInput,
	ConnectorSettingsEntry,
	ConnectorSettingsRecord,
} from '../../shared/connector';
import { CONNECTOR_APPROVAL_POLICIES, CONNECTOR_IDS } from '../../shared/connector';

interface ConnectorSettingsSchema {
	connectors: ConnectorSettingsRecord;
}

type ConnectorStore = {
	get(key: 'connectors'): unknown;
	set(key: 'connectors', value: ConnectorSettingsRecord): void;
	get store(): unknown;
	set store(value: ConnectorSettingsSchema);
};

export interface ConnectorServiceOptions {
	cwd?: string;
	store?: ConnectorStore;
}

const DEFAULT_SETTINGS: ConnectorSettingsSchema = {
	connectors: {},
};

@Service({ factory: () => new ConnectorService() })
export class ConnectorService extends ConnectorSettings {
	private readonly store: ConnectorStore;

	constructor(options: ConnectorServiceOptions = {}) {
		super();
		this.store =
			options.store ??
			new Store<ConnectorSettingsSchema>({
				name: 'settings',
				cwd: options.cwd ?? resolveConnectorSettingsLocation(),
				accessPropertiesByDotNotation: false,
				defaults: DEFAULT_SETTINGS,
			});
	}

	list(): ConnectorSettingsRecord {
		return normalizeConnectorRecord(this.store.get('connectors'));
	}

	get(id: string): ConnectorSettingsRecord {
		const connectorId = resolveConnectorId(id);
		const connector = this.list()[connectorId];
		return connector ? { [connectorId]: connector } : {};
	}

	save(connectors: ConnectorSettingsRecord): ConnectorSettingsRecord {
		const next = normalizeConnectorRecord(connectors);
		this.store.set('connectors', next);
		return next;
	}

	upsert(input: ConnectorInput): ConnectorSettingsRecord {
		if (!isRecord(input)) throw new Error('Connector input must be an object.');

		const connectorId = resolveConnectorId(input.id ?? input.connectorId);
		const connectors = this.list();
		const current = connectors[connectorId];
		const defaults = defaultSettings(connectorId);
		const now = new Date().toISOString();
		const nextConnector: ConnectorSettingsEntry = {
			...defaults,
			...current,
			server_label: optionalTrimmedString(input.serverLabel) ?? current?.server_label ?? defaults.server_label,
			server_url: optionalTrimmedString(input.serverUrl) ?? current?.server_url ?? defaults.server_url,
			server_description:
				optionalTrimmedString(input.serverDescription) ??
				current?.server_description ??
				defaults.server_description,
			authorization: optionalTrimmedString(input.authorization) ?? current?.authorization,
			require_approval: input.requireApproval ?? current?.require_approval ?? defaults.require_approval,
			defer_loading: input.deferLoading ?? current?.defer_loading ?? defaults.defer_loading,
			enabled: input.enabled ?? current?.enabled ?? defaults.enabled,
			created_at: optionalTrimmedString(input.createdAt) ?? current?.created_at ?? now,
			updated_at: now,
			last_refreshed_at: current?.last_refreshed_at,
			last_error: current?.last_error,
		};

		const next = {
			...connectors,
			[connectorId]: nextConnector,
		};
		this.store.set('connectors', next);
		return { [connectorId]: nextConnector };
	}
}

export function resolveConnectorSettingsLocation(): string {
	try {
		return path.join(app.getPath('userData'), 'connector');
	} catch {
		const base =
			process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'connector');
	}
}

function defaultSettings(id: ConnectorId): ConnectorSettingsEntry {
	const connector = SIMPLE_CONNECTORS.find((candidate) => candidate.id === id);
	if (!connector) throw new Error(`Unsupported connector: ${id}`);
	return connector.toSettings();
}

function normalizeConnectorRecord(value: unknown): ConnectorSettingsRecord {
	if (!isRecord(value)) return {};
	const connectors: ConnectorSettingsRecord = {};
	for (const [rawId, rawConnector] of Object.entries(value)) {
		const id = toConnectorId(rawId);
		if (!id || !isConnectorSettingsEntry(rawConnector)) continue;
		connectors[id] = rawConnector;
	}
	return connectors;
}

function isConnectorSettingsEntry(value: unknown): value is ConnectorSettingsEntry {
	return (
		isRecord(value) &&
		value.type === 'mcp' &&
		typeof value.server_label === 'string' &&
		typeof value.server_url === 'string' &&
		(value.server_description === undefined || typeof value.server_description === 'string') &&
		(value.authorization === undefined || typeof value.authorization === 'string') &&
		(value.require_approval === undefined || isConnectorApprovalPolicy(value.require_approval)) &&
		(value.defer_loading === undefined || typeof value.defer_loading === 'boolean') &&
		(value.enabled === undefined || typeof value.enabled === 'boolean') &&
		(value.last_refreshed_at === undefined || typeof value.last_refreshed_at === 'string') &&
		(value.created_at === undefined || typeof value.created_at === 'string') &&
		(value.updated_at === undefined || typeof value.updated_at === 'string') &&
		(value.last_error === undefined || typeof value.last_error === 'string')
	);
}

function resolveConnectorId(value: string | undefined): ConnectorId {
	const id = toConnectorId(value);
	if (!id) throw new Error(`Unsupported connector: ${value ?? ''}`);
	return id;
}

function toConnectorId(value: string | undefined): ConnectorId | undefined {
	const normalized = value?.trim().toLowerCase();
	if (!normalized) return undefined;
	if ((CONNECTOR_IDS as readonly string[]).includes(normalized)) return normalized as ConnectorId;
	return SIMPLE_CONNECTORS.find((connector) => connector.defaults.connectorId === normalized)?.id;
}

function isConnectorApprovalPolicy(value: unknown): value is ConnectorApprovalPolicy {
	return (CONNECTOR_APPROVAL_POLICIES as readonly unknown[]).includes(value);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
