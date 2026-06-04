import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import type { ConnectorRecord } from '../../shared/connectors';
import type { LoggerService } from '../observability';
import {
	readOptionalStringArray,
	readOptionalString,
	requireObject,
	sanitizeInput,
	serverLabelFromName,
	type ConnectorInput,
} from './validation';
import { redactConnectorSecrets } from './runtime';
import { ConnectorRepository } from './repository';

type OpenExternalUrl = (url: string) => Promise<unknown> | unknown;
type ConnectorEntry = ConnectorRecord[string];
type ConnectorsServiceOptions = {
	env?: NodeJS.ProcessEnv;
};
type ConnectorOAuthConnectConfig = {
	service: string;
	serviceId?: string;
	clientIdEnv: string;
	clientSecretEnv?: string;
	authorizationUrl: string;
	tokenUrl: string;
	userInfoUrl?: string;
	scopes: readonly string[];
	accessType?: string;
	prompt?: string;
};

type OAuthConnectRuntimeConfig = ConnectorOAuthConnectConfig;
type OAuthCredential = {
	service: string;
	serviceId?: string;
	authorizationUrl?: string;
	redirectUri: string;
	scopes?: readonly string[];
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
	tokenType?: string;
	scope?: string;
	accountEmail?: string;
	token?: {
		accessToken: string;
		refreshToken?: string;
		tokenType?: string;
		scope?: string;
		expiresAt?: string;
	};
	connectedAt?: string;
};

type OAuthTokenResponse = {
	readonly access_token?: string;
	readonly refresh_token?: string;
	readonly token_type?: string;
	readonly scope?: string;
	readonly expires_in?: number;
	readonly error?: string;
	readonly error_description?: string;
};

type OAuthUserInfoResponse = {
	readonly email?: string;
};

export class ConnectorsService {
	private readonly repository: ConnectorRepository;
	private readonly options: ConnectorsServiceOptions;

	constructor(logger: LoggerService, options?: ConnectorsServiceOptions) {
		this.options = options ?? {};
		this.repository = new ConnectorRepository(logger);
	}

	list(): ConnectorRecord {
		return redactConnectorSecrets(this.repository.list());
	}

	get(id: string): ConnectorRecord {
		return redactConnectorSecrets(this.repository.get(id));
	}

	async connect(input: unknown, openExternalUrl: OpenExternalUrl): Promise<ConnectorRecord> {
		const raw = requireObject(input, 'Connector connection');
		const sanitized = sanitizeInput(input);
		const oauth = readOAuthConnectConfig(raw);
		const credential = await this.authorize(oauth, openExternalUrl);
		const now = new Date().toISOString();
		const connectors = this.repository.list();
		const id = connectorRecordKey(sanitized, oauth);
		const existing = connectors[id];
		const connector = connectorEntryFromInput(sanitized, {
			authorization: credential.token?.accessToken ?? '',
			createdAt: existing?.created_at ?? now,
			updatedAt: now,
		});
		this.repository.write({ ...connectors, [id]: connector });
		return redactConnectorSecrets({ [id]: connector });
	}

	async save(input: unknown): Promise<ConnectorRecord> {
		if (!Array.isArray(input)) throw new Error('Connector settings must be an array.');
		const next: ConnectorRecord = {};
		for (const item of input) {
			const connector = connectorFromInput(item);
			if (connector) next[connector.id] = connector.entry;
		}
		this.repository.write(next);
		return this.list();
	}

	getConnectorSettings(): ConnectorRecord {
		return this.list();
	}

	private async authorize(
		oauth: OAuthConnectRuntimeConfig,
		openExternalUrl: OpenExternalUrl
	): Promise<OAuthCredential> {
		const clientId = requiredEnv(this.env(), oauth.clientIdEnv);
		const clientSecret = oauth.clientSecretEnv ? requiredEnv(this.env(), oauth.clientSecretEnv) : undefined;
		const state = base64Url(randomBytes(24));
		const codeVerifier = base64Url(randomBytes(32));
		const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
		const callback = await waitForOAuthCallback(state);
		const redirectUri = callback.redirectUri;
		const authorizationUrl = new URL(oauth.authorizationUrl);
		authorizationUrl.searchParams.set('client_id', clientId);
		authorizationUrl.searchParams.set('redirect_uri', redirectUri);
		authorizationUrl.searchParams.set('response_type', 'code');
		authorizationUrl.searchParams.set('scope', oauth.scopes.join(' '));
		authorizationUrl.searchParams.set('state', state);
		authorizationUrl.searchParams.set('code_challenge', codeChallenge);
		authorizationUrl.searchParams.set('code_challenge_method', 'S256');
		authorizationUrl.searchParams.set('include_granted_scopes', 'true');
		if (oauth.accessType) authorizationUrl.searchParams.set('access_type', oauth.accessType);
		if (oauth.prompt) authorizationUrl.searchParams.set('prompt', oauth.prompt);

		try {
			await openExternalUrl(authorizationUrl.toString());
			const code = await callback.code;
			const token = await exchangeOAuthCode({
				clientId,
				clientSecret,
				code,
				codeVerifier,
				redirectUri,
				tokenUrl: oauth.tokenUrl,
			});
			const accountEmail = oauth.userInfoUrl && token.access_token
				? await readOAuthAccountEmail(oauth.userInfoUrl, token.access_token)
				: undefined;
			const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : undefined;
			return {
				service: oauth.service,
				serviceId: oauth.serviceId,
				authorizationUrl: oauth.authorizationUrl,
				redirectUri,
				scopes: oauth.scopes,
				accessToken: token.access_token,
				refreshToken: token.refresh_token,
				tokenType: token.token_type,
				scope: token.scope,
				expiresAt: expiresAt ? new Date(expiresAt).getTime() : undefined,
				accountEmail,
				token: {
					accessToken: requiredToken(token.access_token),
					refreshToken: token.refresh_token,
					tokenType: token.token_type,
					scope: token.scope,
					expiresAt,
				},
				connectedAt: new Date().toISOString(),
			};
		} catch (error) {
			callback.close();
			throw error;
		}
	}

	private env(): NodeJS.ProcessEnv {
		return this.options.env ?? process.env;
	}
}

function connectorFromInput(input: unknown): { id: string; entry: ConnectorEntry } | undefined {
	const raw = requireObject(input, 'Connector configuration');
	const now = new Date().toISOString();
	const sanitized = sanitizeInput(input);
	if (!sanitized.serverUrl) {
		if (sanitized.authorization) {
			throw new Error(`Connector serverUrl is required before storing ${sanitized.name}.`);
		}
		return undefined;
	}
	const id = readOptionalString(raw, 'id')?.trim() || connectorRecordKey(sanitized);
	const createdAt = readOptionalString(raw, 'createdAt')?.trim() || now;
	return {
		id,
		entry: connectorEntryFromInput(sanitized, {
			createdAt,
			updatedAt: now,
		}),
	};
}

function connectorEntryFromInput(
	input: ConnectorInput,
	options: {
		authorization?: string;
		createdAt: string;
		updatedAt: string;
	}
): ConnectorEntry {
	const serverLabel = input.serverLabel ?? serverLabelFromName(input.name);
	return {
		type: 'mcp',
		server_label: serverLabel,
		server_url: input.serverUrl ?? '',
		...(input.serverDescription ? { server_description: input.serverDescription } : {}),
		...(options.authorization || input.authorization ? { authorization: options.authorization ?? input.authorization } : {}),
		...(input.requireApproval === 'never' ? { require_approval: 'never' as const } : {}),
		...(input.deferLoading ? { defer_loading: true } : {}),
		...(input.enabled === false ? { enabled: false } : {}),
		created_at: options.createdAt,
		updated_at: options.updatedAt,
	};
}

function connectorRecordKey(
	input: Pick<ConnectorInput, 'connectorId' | 'serverLabel' | 'name'>,
	oauth?: Pick<ConnectorOAuthConnectConfig, 'serviceId'>
): string {
	return (
		storeKeyPart(oauth?.serviceId) ||
		storeKeyPart(input.serverLabel) ||
		storeKeyPart(input.connectorId) ||
		storeKeyPart(input.name)
	);
}

function storeKeyPart(value?: string): string {
	return value?.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') ?? '';
}

function readOAuthConnectConfig(raw: Record<string, unknown>): OAuthConnectRuntimeConfig {
	const oauth = requireObject(raw.oauth, 'Connector OAuth configuration');
	const service = readOptionalString(oauth, 'service')?.trim() ?? '';
	const clientIdEnv = readOptionalString(oauth, 'clientIdEnv')?.trim() ?? '';
	const authorizationUrl = readOptionalString(oauth, 'authorizationUrl')?.trim() ?? '';
	const tokenUrl = readOptionalString(oauth, 'tokenUrl')?.trim() ?? '';
	const scopes = readOptionalStringArray(oauth, 'scopes') ?? [];
	if (!service) throw new Error('OAuth service is required.');
	if (!clientIdEnv) throw new Error('OAuth client id environment variable is required.');
	if (!authorizationUrl) throw new Error('OAuth authorization URL is required.');
	if (!tokenUrl) throw new Error('OAuth token URL is required.');
	if (scopes.length === 0) throw new Error('At least one OAuth scope is required.');
	return {
		service,
		serviceId: readOptionalString(oauth, 'serviceId')?.trim(),
		clientIdEnv,
		clientSecretEnv: readOptionalString(oauth, 'clientSecretEnv')?.trim(),
		authorizationUrl,
		tokenUrl,
		userInfoUrl: readOptionalString(oauth, 'userInfoUrl')?.trim(),
		scopes,
		accessType: readOptionalString(oauth, 'accessType')?.trim(),
		prompt: readOptionalString(oauth, 'prompt')?.trim(),
	};
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
	const value = env[name]?.trim();
	if (!value) throw new Error(`${name} is required to connect this connector.`);
	return value;
}

function requiredToken(value?: string): string {
	if (!value) throw new Error('OAuth token response did not include an access token.');
	return value;
}

function base64Url(value: Buffer): string {
	return value
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/u, '');
}

async function waitForOAuthCallback(expectedState: string): Promise<{
	readonly redirectUri: string;
	readonly code: Promise<string>;
	readonly close: () => void;
}> {
	let server: http.Server | undefined;
	const code = new Promise<string>((resolve, reject) => {
		server = http.createServer((request, response) => {
			try {
				const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
				if (url.pathname !== '/oauth/callback') {
					response.writeHead(404);
					response.end('Not found');
					return;
				}
				const error = url.searchParams.get('error');
				if (error) throw new Error(url.searchParams.get('error_description') ?? error);
				if (url.searchParams.get('state') !== expectedState) throw new Error('OAuth state mismatch.');
				const nextCode = url.searchParams.get('code');
				if (!nextCode) throw new Error('OAuth authorization code is missing.');
				response.writeHead(200, { 'Content-Type': 'text/html' });
				response.end('<!doctype html><title>Connected</title><p>You can return to Friday.</p>');
				resolve(nextCode);
			} catch (error) {
				response.writeHead(400, { 'Content-Type': 'text/plain' });
				response.end(error instanceof Error ? error.message : String(error));
				reject(error);
			} finally {
				server?.close();
			}
		});
	});
	await new Promise<void>((resolve, reject) => {
		server?.once('error', reject);
		server?.listen(0, '127.0.0.1', () => resolve());
	});
	const address = server?.address() as AddressInfo | null;
	if (!address) throw new Error('Could not open OAuth callback server.');
	return {
		redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
		code,
		close: () => server?.close(),
	};
}

async function exchangeOAuthCode(input: {
	readonly clientId: string;
	readonly clientSecret?: string;
	readonly code: string;
	readonly codeVerifier: string;
	readonly redirectUri: string;
	readonly tokenUrl: string;
}): Promise<OAuthTokenResponse> {
	const body = new URLSearchParams({
		client_id: input.clientId,
		code: input.code,
		code_verifier: input.codeVerifier,
		grant_type: 'authorization_code',
		redirect_uri: input.redirectUri,
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	const response = await fetch(input.tokenUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	const data = await response.json() as OAuthTokenResponse;
	if (!response.ok || data.error) {
		throw new Error(data.error_description ?? data.error ?? `OAuth token exchange failed (${response.status}).`);
	}
	return data;
}

async function readOAuthAccountEmail(userInfoUrl: string, accessToken: string): Promise<string | undefined> {
	const response = await fetch(userInfoUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) return undefined;
	const data = await response.json() as OAuthUserInfoResponse;
	return data.email;
}
