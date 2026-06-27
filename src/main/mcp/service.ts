import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { Service } from 'typedi';
import {
	MCP_APPROVAL_POLICIES,
	type McpApprovalPolicy,
	type McpData,
	type McpOAuthStart,
	type McpSettings,
} from '../../shared/mcp/mcp';
import { createOAuthProvider, type McpOAuthStorage } from './oauth';
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
		const servers = this.store.servers();
		const out: McpSettings = {};
		for (const [id, entry] of Object.entries(servers)) out[id] = inferType(entry);
		return out;
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

	async startOAuth(id: string): Promise<McpOAuthStart> {
		const server = this.httpServer(id);
		let redirectUrl: string | undefined;
		const result = await auth(
			createOAuthProvider({
				storage: this.oauthStorage(server.id),
				clientId: server.clientId,
				clientSecret: server.clientSecret,
				onRedirect: (u) => {
					redirectUrl = u.toString();
				},
			}),
			{ serverUrl: server.url },
		);
		if (result === 'AUTHORIZED') return { status: 'authorized' };
		if (redirectUrl) return { status: 'redirect', url: redirectUrl };
		throw new Error(`MCP server "${id}" did not return an authorization URL.`);
	}

	async finishOAuth(id: string, code: string): Promise<void> {
		const server = this.httpServer(id);
		const result = await auth(
			createOAuthProvider({
				storage: this.oauthStorage(server.id),
				clientId: server.clientId,
				clientSecret: server.clientSecret,
			}),
			{ serverUrl: server.url, authorizationCode: code },
		);
		if (result !== 'AUTHORIZED') throw new Error(`OAuth authorization failed for "${id}".`);
	}

	private oauthStorage(id: string): McpOAuthStorage {
		return {
			load: () => this.store.oauth(id),
			save: (state) => this.store.saveOauth(id, state),
		};
	}

	private httpServer(id: string): {
		id: string;
		url: string;
		clientId?: string;
		clientSecret?: string;
	} {
		const connectorId = resolveId(id);
		const entry = this.list()[connectorId];
		if (!entry || entry.type !== 'http') {
			throw new Error(`No http MCP server "${id}".`);
		}
		return {
			id: connectorId,
			url: entry.url,
			clientId: entry.client_id,
			clientSecret: entry.client_secret,
		};
	}
}

export { resolveConnectorSettingsLocation } from './store';

function resolveId(value: string | undefined): string {
	const id = value?.trim().toLowerCase();
	if (!id) throw new Error('Connector ID is required.');
	return id;
}

// The standard mcpServers format omits `type`: command-based entries are stdio,
// url-based entries are http. Fill it in so the UI's discriminated union works.
function inferType(entry: McpData): McpData {
	const shape = entry as { type?: string; command?: unknown; url?: unknown };
	if (shape.type) return entry;
	if (typeof shape.command === 'string') return { ...entry, type: 'stdio' } as McpData;
	if (typeof shape.url === 'string') return { ...entry, type: 'http' } as McpData;
	return entry;
}

function normalizeConnectorRecord(value: unknown): McpSettings {
	if (!isRecord(value)) return {};
	const connectors: McpSettings = {};
	for (const [rawId, rawEntry] of Object.entries(value)) {
		const id = rawId.trim().toLowerCase();
		if (!id) continue;
		if (!isConnectorEntry(rawEntry)) continue;
		connectors[id] = rawEntry;
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
			(value.client_id === undefined || typeof value.client_id === 'string') &&
			(value.client_secret === undefined || typeof value.client_secret === 'string') &&
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
