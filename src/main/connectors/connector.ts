import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import { app, shell } from 'electron';
import Store from 'electron-store';
import { Service } from 'typedi';
import { McpData } from '../agent/core/mcp';
import type { Mcp } from '../agent/core/mcp';
import type {
	ConnectorApprovalPolicy,
	ConnectorData,
	ConnectorId,
	ConnectorInput,
	ConnectorOAuthAuthorizationResult,
	ConnectorOAuthDefaults,
	ConnectorSettingsRecord,
} from '../../shared/connector';
import {
	CONNECTOR_APPROVAL_POLICIES,
	CONNECTOR_DEFAULTS,
	CONNECTOR_IDS,
} from '../../shared/connector';

export interface ConnectorOptions {
	cwd?: string;
}

type ConnectorStoreSchema = { mcpServers: Record<string, unknown> };

const DEFAULT_SETTINGS: ConnectorStoreSchema = { mcpServers: {} };
const OAUTH_TIMEOUT_MS = 120_000;

@Service({ factory: () => new Connector() })
export class Connector extends McpData {
	private readonly store: Store<ConnectorStoreSchema>;

	constructor(options: ConnectorOptions = {}) {
		super();
		this.store = new Store<ConnectorStoreSchema>({
			name: 'setting',
			cwd: options.cwd ?? resolveConnectorSettingsLocation(),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	list(): ConnectorSettingsRecord {
		const data = this.store.store;
		// Support old format (connector IDs at root level, no mcpServers wrapper)
		const source =
			isRecord(data) && isRecord(data.mcpServers) ? data.mcpServers : data;
		return normalizeConnectorRecord(source);
	}

	get(id: string): ConnectorSettingsRecord {
		const connectorId = resolveConnectorId(id);
		const connector = this.list()[connectorId];
		return connector ? { [connectorId]: connector } : {};
	}

	save(connectors: ConnectorSettingsRecord): ConnectorSettingsRecord {
		const next = normalizeConnectorRecord(connectors);
		this.store.store = { mcpServers: next };
		return next;
	}

	upsert(input: ConnectorInput): ConnectorSettingsRecord {
		if (!isRecord(input)) throw new Error('Connector input must be an object.');

		const connectorId = resolveConnectorId(input.id);
		const connectors = this.list();
		const current = connectors[connectorId];
		const defaults = defaultSettings(connectorId);
		const now = new Date().toISOString();
		const incomingToken = optionalTrimmedString(input.token);
		const nextConnector: ConnectorData = {
			...defaults,
			...current,
			url: current?.url ?? defaults.url,
			token: incomingToken ?? current?.token,
			refresh_token: optionalTrimmedString(input.refreshToken) ?? current?.refresh_token,
			token_expires_at: optionalTrimmedString(input.tokenExpiresAt) ?? current?.token_expires_at,
			require_approval:
				input.requireApproval ?? current?.require_approval ?? defaults.require_approval,
			defer_loading: input.deferLoading ?? current?.defer_loading ?? defaults.defer_loading,
			enabled: input.enabled ?? current?.enabled ?? defaults.enabled,
			created_at: optionalTrimmedString(input.createdAt) ?? current?.created_at ?? now,
			updated_at: now,
			last_refreshed_at: incomingToken ? now : current?.last_refreshed_at,
			last_error: incomingToken ? undefined : current?.last_error,
		};

		const next = { ...connectors, [connectorId]: nextConnector };
		this.store.store = { mcpServers: next };
		return { [connectorId]: nextConnector };
	}

	async authorizeOAuth(input: ConnectorOAuthDefaults): Promise<ConnectorOAuthAuthorizationResult> {
		const request = normalizeOAuthRequest(input);
		const clientId = envValue(request.clientIdEnv);
		if (!clientId) throw new Error(`Missing OAuth client id: ${request.clientIdEnv}`);
		const clientSecret = request.clientSecretEnv ? envValue(request.clientSecretEnv) : undefined;
		const state = base64Url(randomBytes(32));
		const codeVerifier = base64Url(randomBytes(32));
		const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
		const callback = await waitForOAuthCallback({
			request,
			clientId,
			state,
			codeChallenge,
		});

		const token = await exchangeOAuthCode({
			request,
			clientId,
			clientSecret,
			code: callback.code,
			redirectUri: callback.redirectUri,
			codeVerifier,
		});

		return {
			accessToken: token.accessToken,
			refreshToken: token.refreshToken,
			expiresIn: token.expiresIn,
		};
	}

	async refresh(): Promise<void> {
		const connectors = this.list();
		await Promise.allSettled(
			Object.entries(connectors).map(async ([id, connector]) => {
				if (connector.enabled === false) return;
				if (!connector.refresh_token) return;
				if (!isTokenExpired(connector)) return;

				const connectorId = toConnectorId(id);
				if (!connectorId) return;
				const defaults = CONNECTOR_DEFAULTS.find((d) => d.id === connectorId);
				if (!defaults) return;

				try {
					const clientId = envValue(defaults.oauth.clientIdEnv);
					const clientSecret = defaults.oauth.clientSecretEnv
						? envValue(defaults.oauth.clientSecretEnv)
						: undefined;
					if (!clientId) return;

					const token = await refreshOAuthToken(
						connector.refresh_token,
						clientId,
						clientSecret,
						defaults.oauth.tokenUrl
					);

					const now = new Date().toISOString();
					const nextConnector: ConnectorData = {
						...connector,
						token: token.accessToken,
						refresh_token: token.refreshToken ?? connector.refresh_token,
						token_expires_at: token.expiresIn
							? new Date(Date.now() + token.expiresIn * 1000).toISOString()
							: undefined,
						last_refreshed_at: now,
						updated_at: now,
						last_error: undefined,
					};
					const current = this.store.store.mcpServers ?? {};
					this.store.store = { mcpServers: { ...current, [id]: nextConnector } };
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					const nextConnector: ConnectorData = {
						...connector,
						last_error: message,
						updated_at: new Date().toISOString(),
					};
					const current = this.store.store.mcpServers ?? {};
					this.store.store = { mcpServers: { ...current, [id]: nextConnector } };
				}
			})
		);
	}

	mcp(): Mcp[] {
		const connectors = this.list();
		return Object.entries(connectors)
			.filter(([, connector]) => connector.enabled !== false)
			.map(([id, connector]) => ({
				serverLabel: id,
				serverUrl: connector.url,
				authorization: connector.token,
				requireApproval: connector.require_approval,
				deferLoading: connector.defer_loading,
				enabled: connector.enabled,
			}));
	}
}

export function resolveConnectorSettingsLocation(): string {
	try {
		return path.join(app.getPath('appData'), app.getName(), 'connectors');
	} catch {
		const base =
			process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'connectors');
	}
}

function defaultSettings(id: ConnectorId): ConnectorData {
	const connector = CONNECTOR_DEFAULTS.find((candidate) => candidate.id === id);
	if (!connector) throw new Error(`Unsupported connector: ${id}`);
	return {
		type: 'http',
		url: connector.url,
		require_approval: connector.requireApproval,
		defer_loading: connector.deferLoading,
		enabled: connector.enabled,
	};
}

interface OAuthAuthorizationRequest {
	readonly service: string;
	readonly serviceId?: string;
	readonly clientIdEnv: string;
	readonly clientSecretEnv?: string;
	readonly authorizationUrl: string;
	readonly tokenUrl: string;
	readonly userInfoUrl?: string;
	readonly scopes: readonly string[];
	readonly accessType?: string;
	readonly prompt?: string;
}

interface OAuthCallbackInput {
	readonly request: OAuthAuthorizationRequest;
	readonly clientId: string;
	readonly state: string;
	readonly codeChallenge: string;
}

interface OAuthTokenInput {
	readonly request: OAuthAuthorizationRequest;
	readonly clientId: string;
	readonly clientSecret?: string;
	readonly code: string;
	readonly redirectUri: string;
	readonly codeVerifier: string;
}

function normalizeOAuthRequest(input: ConnectorOAuthDefaults): OAuthAuthorizationRequest {
	if (!isRecord(input)) throw new Error('OAuth input must be an object.');
	const service = optionalTrimmedString(input.service);
	const clientIdEnv = optionalTrimmedString(input.clientIdEnv);
	const authorizationUrl = optionalTrimmedString(input.authorizationUrl);
	const tokenUrl = optionalTrimmedString(input.tokenUrl);
	const scopes = Array.isArray(input.scopes)
		? input.scopes.map(optionalTrimmedString).filter((scope): scope is string => Boolean(scope))
		: [];
	if (!service) throw new Error('OAuth service is required.');
	if (!clientIdEnv) throw new Error('OAuth client id env var is required.');
	if (!authorizationUrl || !isValidUrl(authorizationUrl))
		throw new Error('OAuth authorization URL is invalid.');
	if (!tokenUrl || !isValidUrl(tokenUrl)) throw new Error('OAuth token URL is invalid.');
	if (scopes.length === 0) throw new Error('OAuth scopes are required.');

	return {
		service,
		serviceId: optionalTrimmedString(input.serviceId),
		clientIdEnv,
		clientSecretEnv: optionalTrimmedString(input.clientSecretEnv),
		authorizationUrl,
		tokenUrl,
		userInfoUrl: optionalTrimmedString(input.userInfoUrl),
		scopes,
		accessType: optionalTrimmedString(input.accessType),
		prompt: optionalTrimmedString(input.prompt),
	};
}

async function waitForOAuthCallback(
	input: OAuthCallbackInput
): Promise<{ code: string; redirectUri: string }> {
	return new Promise((resolve, reject) => {
		let redirectUri = '';
		const server = createServer((request, response) => {
			try {
				if (!request.url) throw new Error('OAuth callback URL is missing.');
				const callbackUrl = new URL(request.url, redirectUri);
				const error = callbackUrl.searchParams.get('error');
				if (error) throw new Error(`OAuth authorization failed: ${error}`);
				if (callbackUrl.searchParams.get('state') !== input.state) {
					throw new Error('OAuth authorization state mismatch.');
				}
				const code = callbackUrl.searchParams.get('code');
				if (!code) throw new Error('OAuth authorization code is missing.');
				response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
				response.end(
					'<!doctype html><title>Friday</title><p>Authorization complete. You can close this window.</p>'
				);
				cleanup();
				resolve({ code, redirectUri });
			} catch (error) {
				response.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
				response.end(
					'<!doctype html><title>Friday</title><p>Authorization failed. You can close this window.</p>'
				);
				cleanup();
				reject(error);
			}
		});
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('OAuth authorization timed out.'));
		}, OAUTH_TIMEOUT_MS);
		const cleanup = (): void => {
			clearTimeout(timeout);
			server.close();
		};
		server.once('error', (error) => {
			cleanup();
			reject(error);
		});
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				cleanup();
				reject(new Error('Failed to start OAuth callback server.'));
				return;
			}
			redirectUri = `http://127.0.0.1:${address.port}`;
			shell.openExternal(buildAuthorizationUrl(input, redirectUri)).catch((error) => {
				cleanup();
				reject(error);
			});
		});
	});
}

function buildAuthorizationUrl(input: OAuthCallbackInput, redirectUri: string): string {
	const url = new URL(input.request.authorizationUrl);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', input.clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('scope', input.request.scopes.join(' '));
	url.searchParams.set('state', input.state);
	url.searchParams.set('code_challenge', input.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	if (input.request.accessType) url.searchParams.set('access_type', input.request.accessType);
	if (input.request.prompt) url.searchParams.set('prompt', input.request.prompt);
	return url.toString();
}

interface OAuthTokenResult {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
}

async function exchangeOAuthCode(input: OAuthTokenInput): Promise<OAuthTokenResult> {
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code: input.code,
		redirect_uri: input.redirectUri,
		client_id: input.clientId,
		code_verifier: input.codeVerifier,
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);

	const response = await fetch(input.request.tokenUrl, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'content-type': 'application/x-www-form-urlencoded',
		},
		body,
	});
	const payload = await response.json().catch((): unknown => ({}));
	if (!response.ok) throw new Error(oauthTokenErrorMessage(payload));
	if (
		!isRecord(payload) ||
		typeof payload.access_token !== 'string' ||
		!payload.access_token.trim()
	) {
		throw new Error('OAuth token response did not include an access token.');
	}
	return {
		accessToken: payload.access_token.trim(),
		refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token.trim() || undefined : undefined,
		expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
	};
}

async function refreshOAuthToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string | undefined,
	tokenUrl: string
): Promise<OAuthTokenResult> {
	const body = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		client_id: clientId,
	});
	if (clientSecret) body.set('client_secret', clientSecret);

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: {
			accept: 'application/json',
			'content-type': 'application/x-www-form-urlencoded',
		},
		body,
	});
	const payload = await response.json().catch((): unknown => ({}));
	if (!response.ok) throw new Error(oauthTokenErrorMessage(payload));
	if (
		!isRecord(payload) ||
		typeof payload.access_token !== 'string' ||
		!payload.access_token.trim()
	) {
		throw new Error('Token refresh response did not include an access token.');
	}
	return {
		accessToken: payload.access_token.trim(),
		refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token.trim() || undefined : undefined,
		expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
	};
}

function isTokenExpired(connector: ConnectorData): boolean {
	if (!connector.token_expires_at) {
		// No expiry stored — use last_refreshed_at as a fallback assuming 1-hour tokens
		if (!connector.last_refreshed_at) return false;
		const refreshedAt = new Date(connector.last_refreshed_at).getTime();
		return Date.now() > refreshedAt + 55 * 60 * 1000;
	}
	const expiresAt = new Date(connector.token_expires_at).getTime();
	return Date.now() > expiresAt - 5 * 60 * 1000;
}

function oauthTokenErrorMessage(payload: unknown): string {
	if (!isRecord(payload)) return 'OAuth token exchange failed.';
	const description = optionalTrimmedString(payload.error_description);
	if (description) return description;
	const error = optionalTrimmedString(payload.error);
	return error ? `OAuth token exchange failed: ${error}` : 'OAuth token exchange failed.';
}

function envValue(name: string): string | undefined {
	return optionalTrimmedString(process.env[name]);
}

function base64Url(bytes: Buffer): string {
	return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function migrateConnectorEntry(value: unknown): unknown {
	if (!isRecord(value) || value.type !== 'mcp') return value;
	// Migrate from old format: type=mcp, server_url, authorization → type=http, url, token
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

function normalizeConnectorRecord(value: unknown): ConnectorSettingsRecord {
	if (!isRecord(value)) return {};
	const connectors: ConnectorSettingsRecord = {};
	for (const [rawId, rawConnector] of Object.entries(value)) {
		const id = toConnectorId(rawId);
		const entry = migrateConnectorEntry(rawConnector);
		if (!id || !isConnectorSettingsEntry(entry)) continue;
		const defaults = defaultSettings(id);
		connectors[id] = {
			...defaults,
			...entry,
			url: entry.url ?? defaults.url,
		};
	}
	return connectors;
}

function isConnectorSettingsEntry(value: unknown): value is ConnectorData {
	return (
		isRecord(value) &&
		value.type === 'http' &&
		typeof value.url === 'string' &&
		(value.token === undefined || typeof value.token === 'string') &&
		(value.refresh_token === undefined || typeof value.refresh_token === 'string') &&
		(value.token_expires_at === undefined || typeof value.token_expires_at === 'string') &&
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
	return undefined;
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
