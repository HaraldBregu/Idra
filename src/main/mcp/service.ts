import { Service } from 'typedi';
import {
	MCP_APPROVAL_POLICIES,
	type McpApprovalPolicy,
	type McpData,
	type McpSettings,
} from '../../shared/mcp/mcp';
import { McpStore } from './store';

export interface ConnectorOptions {
	cwd?: string;
}

@Service()
export class McpService {
	private readonly store: McpStore;

	constructor(options: ConnectorOptions = {}) {
		this.store = new McpStore(options.cwd);
	}

	list(): McpSettings {
		return this.store.servers();
	}

	get(id: string): McpSettings {
		const connectorId = resolveId(id);
		const connector = this.list()[connectorId];
		return connector ? { [connectorId]: connector } : {};
	}

	save(connectors: McpSettings): McpSettings {
		const next = normalizeConnectorRecord(connectors);
		this.store.write(next);
		return next;
	}

	delete(id: string): void {
		const connectorId = resolveId(id);
		const connectors = this.list();
		const next = { ...connectors };
		delete next[connectorId];
		this.store.write(next);
	}
}

export { resolveConnectorSettingsLocation } from './store';

function resolveId(value: string | undefined): string {
	const id = value?.trim().toLowerCase();
	if (!id) throw new Error('Connector ID is required.');
	return id;
}

function migrateConnectorEntry(value: unknown): unknown {
	if (!isRecord(value)) return value;
	// Standard MCP client config format: streamable-http transport with auth in headers.
	if (value.type === 'streamable-http' || value.type === 'http' || value.type === 'sse') {
		return {
			type: 'http',
			url: value.url,
			token: optionalTrimmedString(value.token) ?? bearerFromHeaders(value.headers),
			refresh_token: value.refresh_token,
			token_expires_at: value.token_expires_at,
			require_approval: value.require_approval,
			defer_loading: value.defer_loading,
			enabled: value.enabled,
			last_refreshed_at: value.last_refreshed_at,
			created_at: value.created_at,
			updated_at: value.updated_at,
			last_error: value.last_error,
		};
	}
	if (value.type !== 'mcp') return value;
	return {
		type: 'http',
		url: value.server_url,
		token: value.authorization,
		refresh_token: value.refresh_token,
		token_expires_at: value.token_expires_at,
		require_approval: value.require_approval,
		defer_loading: value.defer_loading,
		enabled: value.enabled,
		last_refreshed_at: value.last_refreshed_at,
		created_at: value.created_at,
		updated_at: value.updated_at,
		last_error: value.last_error,
	};
}

function normalizeConnectorRecord(value: unknown): McpSettings {
	if (!isRecord(value)) return {};
	const connectors: McpSettings = {};
	for (const [rawId, rawEntry] of Object.entries(value)) {
		const id = rawId.trim().toLowerCase();
		if (!id) continue;
		const entry = migrateConnectorEntry(rawEntry);
		if (!isConnectorEntry(entry)) continue;
		connectors[id] = entry;
	}
	return connectors;
}

function isConnectorEntry(value: unknown): value is McpData {
	if (!isRecord(value)) return false;
	const { type } = value;
	if (type === 'stdio') {
		return (
			typeof value.command === 'string' &&
			(value.args === undefined || Array.isArray(value.args)) &&
			(value.env === undefined || isStringRecord(value.env)) &&
			(value.cwd === undefined || typeof value.cwd === 'string') &&
			isCommonFields(value)
		);
	}
	if (type === 'http') {
		return (
			typeof value.url === 'string' &&
			(value.token === undefined || typeof value.token === 'string') &&
			isCommonFields(value)
		);
	}
	return false;
}

function isCommonFields(value: Record<string, unknown>): boolean {
	return (
		(value.require_approval === undefined ||
			isConnectorApprovalPolicy(value.require_approval)) &&
		(value.defer_loading === undefined || typeof value.defer_loading === 'boolean') &&
		(value.enabled === undefined || typeof value.enabled === 'boolean') &&
		(value.created_at === undefined || typeof value.created_at === 'string') &&
		(value.updated_at === undefined || typeof value.updated_at === 'string') &&
		(value.last_error === undefined || typeof value.last_error === 'string')
	);
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		isRecord(value) && Object.values(value).every((v) => typeof v === 'string')
	);
}

function isConnectorApprovalPolicy(value: unknown): value is McpApprovalPolicy {
	return (MCP_APPROVAL_POLICIES as readonly unknown[]).includes(value);
}

function bearerFromHeaders(headers: unknown): string | undefined {
	if (!isRecord(headers)) return undefined;
	const auth = optionalTrimmedString(headers.Authorization ?? headers.authorization);
	if (!auth) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(auth);
	return match ? match[1] : auth;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
