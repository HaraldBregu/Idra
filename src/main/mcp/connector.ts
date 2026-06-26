import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { app, shell } from 'electron';
import { Service } from 'typedi';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { McpStore } from './store';

export interface ConnectorOptions {
	cwd?: string;
}

const OAUTH_TIMEOUT_MS = 120_000;

@Service()
export class Connector {
	private readonly store: McpStore;
	private readonly clients = new Map<string, Client>();

	constructor(options: ConnectorOptions = {}) {
		this.store = new McpStore(options.cwd);
	}

	list(): McpSettingsRecord {
		return this.store.servers();
	}

	get(id: string): McpSettingsRecord {
		const connectorId = resolveId(id);
		const connector = this.list()[connectorId];
		return connector ? { [connectorId]: connector } : {};
	}

	save(connectors: McpSettingsRecord): McpSettingsRecord {
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

	async authorizeOAuth(input: McpOAuthDefaults): Promise<McpOAuthAuthorizationResult> {
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

	async connect(id: string): Promise<Client> {
		const connectorId = resolveId(id);
		const existing = this.clients.get(connectorId);
		if (existing) return existing;

		const data = this.get(connectorId)[connectorId];
		if (!data) throw new Error(`Connector not found: ${connectorId}`);
		if (data.enabled === false) throw new Error(`Connector is disabled: ${connectorId}`);

		const client = new Client({ name: app.getName(), version: app.getVersion() });
		try {
			await client.connect(buildTransport(data));
		} catch (error) {
			await client.close().catch(() => undefined);
			throw error;
		}
		this.clients.set(connectorId, client);
		return client;
	}

	async listTools(id: string): ReturnType<Client['listTools']> {
		const client = await this.connect(id);
		return client.listTools();
	}

	async callTool(
		id: string,
		name: string,
		args?: Record<string, unknown>
	): ReturnType<Client['callTool']> {
		const client = await this.connect(id);
		return client.callTool({ name, arguments: args });
	}

	async disconnect(id: string): Promise<void> {
		const connectorId = resolveId(id);
		const client = this.clients.get(connectorId);
		if (!client) return;
		this.clients.delete(connectorId);
		await client.close();
	}

	async disconnectAll(): Promise<void> {
		const clients = [...this.clients.values()];
		this.clients.clear();
		await Promise.allSettled(clients.map((client) => client.close()));
	}
}

function buildTransport(data: McpData): Transport {
	if (data.type === 'stdio') {
		return new StdioClientTransport({
			command: data.command,
			args: data.args ? [...data.args] : undefined,
			env: data.env ? { ...data.env } : undefined,
			cwd: data.cwd,
		});
	}

	const url = new URL(data.url);
	const headers = data.token ? { Authorization: `Bearer ${data.token}` } : undefined;

	return new StreamableHTTPClientTransport(url, {
		requestInit: headers ? { headers } : undefined,
	});
}

export { resolveConnectorSettingsLocation } from './store';

function resolveId(value: string | undefined): string {
	const id = value?.trim().toLowerCase();
	if (!id) throw new Error('Connector ID is required.');
	return id;
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

function normalizeOAuthRequest(input: McpOAuthDefaults): OAuthAuthorizationRequest {
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
		refreshToken:
			typeof payload.refresh_token === 'string'
				? payload.refresh_token.trim() || undefined
				: undefined,
		expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
	};
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

function normalizeConnectorRecord(value: unknown): McpSettingsRecord {
	if (!isRecord(value)) return {};
	const connectors: McpSettingsRecord = {};
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

