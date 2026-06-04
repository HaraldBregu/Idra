import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { LoggerService } from '../observability';
import type {
	ConnectorConnectInput,
	ConnectorConfig,
	ConnectorOAuthCredential,
	ConnectorView,
} from '../../shared/connector';
import {
	readOptionalStringArray,
	readOptionalString,
	requireObject,
	sanitizeInput,
	serverLabelFromName,
} from './components/validation';
import {
	cloneValue,
	redactConnectorSecrets,
	toConnectorView,
} from './components/runtime';
import { ConnectorRepository } from './components/repository';
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
		return this.connectors().map((connector) => toConnectorView(connector, this.env()));
	}

	get(id: string): ConnectorConfig {
		return redactConnectorSecrets(this.repository.get(id));
	}

	async connect(input: unknown, openExternalUrl: OpenExternalUrl): Promise<ConnectorView> {
		const raw = requireObject(input, 'Connector connection');
		const sanitized = sanitizeInput(input);
		if (!sanitized.serverUrl) throw new Error('Connector MCP server URL is required.');
		const oauth = readOAuthConnectConfig(raw);
		const credential = await this.authorize(oauth, openExternalUrl);
		const now = new Date().toISOString();
		const connectors = this.connectors();
		const existing = connectors.find((connector) => connector.connectorId === sanitized.connectorId);
		const connector: ConnectorConfig = {
			id: existing?.id ?? randomUUID(),
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			serverUrl: sanitized.serverUrl,
			enabled: sanitized.enabled ?? true,
			authorization: credential.token?.accessToken ?? '',
			mcp: undefined,
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
		return toConnectorView(connector, this.env());
	}

	async save(input: unknown): Promise<ConnectorConfig[]> {
		if (!Array.isArray(input)) throw new Error('Connector settings must be an array.');
		const next: ConnectorConfig[] = [];
		for (const item of input) {
			next.push(await this.connectorFromInput(item));
		}
		this.repository.write(next);
		return next.map(redactConnectorSecrets);
	}

	getConnectorSettings(): ConnectorConfig[] {
		return this.connectors().map(redactConnectorSecrets);
	}

	listStored(): ConnectorConfig[] {
		return this.connectors();
	}

	getStored(id: string): ConnectorConfig {
		return this.repository.get(id);
	}

	replaceStored(connector: ConnectorConfig): void {
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

	private connectors(): ConnectorConfig[] {
		return this.repository.list();
	}

	private env(): NodeJS.ProcessEnv {
		return this.options.env ?? process.env;
	}

	private async connectorFromInput(input: unknown): Promise<ConnectorConfig> {
		const raw = requireObject(input, 'Connector configuration');
		const now = new Date().toISOString();
		const id = readOptionalString(raw, 'id')?.trim() || randomUUID();
		const createdAt = readOptionalString(raw, 'createdAt')?.trim() || now;
		const sanitized = sanitizeInput(input);
		const connector: ConnectorConfig = {
			id,
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			serverUrl: sanitized.serverUrl,
			enabled: sanitized.enabled ?? true,
			authorization: sanitized.authorization ?? '',
			mcp: cloneValue(sanitized.mcp),
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
