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

const DEFAULT_SETTINGS: ConnectorSettingsRecord = {};
const OAUTH_TIMEOUT_MS = 120_000;

@Service({ factory: () => new Connector() })
export class Connector extends McpData {
	private readonly store: Store<ConnectorSettingsRecord>;

	constructor(options: ConnectorOptions = {}) {
		super();
		this.store = new Store<ConnectorSettingsRecord>({
			name: 'setting',
			cwd: options.cwd ?? resolveConnectorSettingsLocation(),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	list(): ConnectorSettingsRecord {
		return normalizeConnectorRecord(this.store.store);
	}

	get(id: string): ConnectorSettingsRecord {
		const connectorId = resolveConnectorId(id);
		const connector = this.list()[connectorId];
		return connector ? { [connectorId]: connector } : {};
	}

	save(connectors: ConnectorSettingsRecord): ConnectorSettingsRecord {
		const next = normalizeConnectorRecord(connectors);
		this.store.store = next;
		return next;
	}

	upsert(input: ConnectorInput): ConnectorSettingsRecord {
		if (!isRecord(input)) throw new Error('Connector input must be an object.');

		const connectorId = resolveConnectorId(input.id);
		const connectors = this.list();
		const current = connectors[connectorId];
		const defaults = defaultSettings(connectorId);
		const now = new Date().toISOString();
		const nextConnector: ConnectorData = {
			...defaults,
			...current,
			server_label:
				optionalTrimmedString(input.serverLabel) ?? current?.server_label ?? defaults.server_label,
			server_url:
				optionalTrimmedString(input.serverUrl) ?? current?.server_url ?? defaults.server_url,
			server_description:
				optionalTrimmedString(input.serverDescription) ??
				current?.server_description ??
				defaults.server_description,
			authorization: optionalTrimmedString(input.authorization) ?? current?.authorization,
			require_approval:
				input.requireApproval ?? current?.require_approval ?? defaults.require_approval,
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
		this.store.store = next;
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

		return { accessToken: token };
	}

	mcp(): Mcp[] {
		const mcp: Mcp[] = [];

		for (const connector of Object.values(this.list())) {
			if (connector.enabled === false) continue;

			mcp.push({
				serverLabel: connector.server_label,
				serverUrl: connector.server_url,
				...(connector.authorization ? { authorization: connector.authorization } : {}),
				...(connector.require_approval ? { requireApproval: connector.require_approval } : {}),
				...(connector.defer_loading !== undefined
					? { deferLoading: connector.defer_loading }
					: {}),
				...(connector.server_description
					? { serverDescription: connector.server_description }
					: {}),
			});
		}

		return mcp;
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
		type: 'mcp',
		server_label: connector.serverLabel,
		server_url: connector.serverUrl,
		server_description: connector.serverDescription,
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

async function exchangeOAuthCode(input: OAuthTokenInput): Promise<string> {
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
	return payload.access_token.trim();
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

function isConnectorSettingsEntry(value: unknown): value is ConnectorData {
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
