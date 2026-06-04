import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { LoggerService } from '../observability';
import type {
	ConnectorConnectInput,
	ConnectorOAuthCredential,
	ConnectorRecord,
	ConnectorView,
} from '../../shared/connector';
import {
	readOptionalStringArray,
	readOptionalString,
	requireObject,
	sanitizeInput,
	serverLabelFromName,
} from './validation';
import {
	redactConnectorSecrets,
	toConnectorView,
} from './runtime';
import { ConnectorRepository } from './repository';
import type { ConnectorsServiceOptions } from './types';

type OpenExternalUrl = (url: string) => Promise<unknown> | unknown;

type OAuthConnectRuntimeConfig = ConnectorConnectInput['oauth'];

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

	list(): ConnectorView[] {
		return this.connectors().map((connector) => toConnectorView(connector));
	}

	get(id: string): ConnectorRecord {
		return redactConnectorSecrets(this.repository.get(id));
	}

	async connect(input: unknown, openExternalUrl: OpenExternalUrl): Promise<ConnectorView> {
		const raw = requireObject(input, 'Connector connection');
		const sanitized = sanitizeInput(input);
		const oauth = readOAuthConnectConfig(raw);
		const credential = await this.authorize(oauth, openExternalUrl);
		const now = new Date().toISOString();
		const connectors = this.connectors();
		const existing = connectors.find((connector) => connector.connectorId === sanitized.connectorId);
		const connector: ConnectorRecord = {
			id: existing?.id ?? randomUUID(),
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			serverUrl: sanitized.serverUrl,
			enabled: sanitized.enabled ?? true,
			authorization: credential.token?.accessToken ?? '',
			oauth: credential,
			requireApproval: sanitized.requireApproval ?? 'always',
			allowedTools: sanitized.allowedTools ?? [],
			deferLoading: sanitized.deferLoading ?? false,
			tools: existing?.tools ?? [],
			lastRefreshedAt: existing?.lastRefreshedAt,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		this.repository.write(
			existing
				? connectors.map((item) => (item.id === existing.id ? connector : item))
				: [...connectors, connector]
		);
		return toConnectorView(connector);
	}

	async save(input: unknown): Promise<ConnectorRecord[]> {
		if (!Array.isArray(input)) throw new Error('Connector settings must be an array.');
		const next: ConnectorRecord[] = [];
		for (const item of input) {
			next.push(await this.connectorFromInput(item));
		}
		this.repository.write(next);
		return this.connectors().map(redactConnectorSecrets);
	}

	getConnectorSettings(): ConnectorRecord[] {
		return this.connectors().map(redactConnectorSecrets);
	}

	listStored(): ConnectorRecord[] {
		return this.connectors();
	}

	getStored(id: string): ConnectorRecord {
		return this.repository.get(id);
	}

	replaceStored(connector: ConnectorRecord): void {
		this.repository.replace(connector);
	}

	private async authorize(
		oauth: OAuthConnectRuntimeConfig,
		openExternalUrl: OpenExternalUrl
	): Promise<ConnectorOAuthCredential> {
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

	private connectors(): ConnectorRecord[] {
		return this.repository.list();
	}

	private env(): NodeJS.ProcessEnv {
		return this.options.env ?? process.env;
	}

	private async connectorFromInput(input: unknown): Promise<ConnectorRecord> {
		const raw = requireObject(input, 'Connector configuration');
		const now = new Date().toISOString();
		const id = readOptionalString(raw, 'id')?.trim() || randomUUID();
		const createdAt = readOptionalString(raw, 'createdAt')?.trim() || now;
		const sanitized = sanitizeInput(input);
		const connector: ConnectorRecord = {
			id,
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			serverUrl: sanitized.serverUrl,
			enabled: sanitized.enabled ?? true,
			authorization: sanitized.authorization ?? '',
			oauth: undefined,
			requireApproval: sanitized.requireApproval ?? 'always',
			allowedTools: sanitized.allowedTools ?? [],
			deferLoading: sanitized.deferLoading ?? false,
			tools: [],
			createdAt,
			updatedAt: now,
		};
		return connector;
	}
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
				response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				response.end('<!doctype html><title>Friday</title><p>Gmail connected. You can close this window.</p>');
				resolve(nextCode);
				server?.close();
			} catch (error) {
				response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
				response.end('<!doctype html><title>Friday</title><p>Gmail connection failed. You can close this window.</p>');
				reject(error);
				server?.close();
			}
		});
		server.on('error', reject);
	});

	await new Promise<void>((resolve, reject) => {
		if (!server) {
			reject(new Error('OAuth callback server failed to start.'));
			return;
		}
		server.listen(0, '127.0.0.1', () => resolve());
	});

	const startedServer = server;
	if (!startedServer) throw new Error('OAuth callback server failed to start.');
	const address = startedServer.address() as AddressInfo;
	return {
		redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
		code,
		close: () => startedServer.close(),
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
		redirect_uri: input.redirectUri,
		grant_type: 'authorization_code',
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	const response = await fetch(input.tokenUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	const payload = (await response.json()) as OAuthTokenResponse;
	if (!response.ok || payload.error) {
		throw new Error(payload.error_description ?? payload.error ?? 'OAuth token exchange failed.');
	}
	requiredToken(payload.access_token);
	return payload;
}

async function readOAuthAccountEmail(userInfoUrl: string, accessToken: string): Promise<string | undefined> {
	const response = await fetch(userInfoUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) return undefined;
	const payload = (await response.json()) as OAuthUserInfoResponse;
	return payload.email;
}
