import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { shell } from 'electron';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';
import type { AgentTool, ToolContext } from '../tools/types';
import { textResult } from '../tools/types';
import {
	OPENAI_CONNECTOR_CATALOG,
	getConnectorCatalogItem,
	isOpenAiConnectorId,
	type ConnectorConfig,
	type ConnectorInput,
	type ConnectorOAuthConnectResult,
	type ConnectorStatus,
	type ConnectorTestResult,
	type ConnectorTool,
	type ConnectorUpdateInput,
	type ConnectorView,
	type GoogleOAuthCredential,
} from '../../shared/connectors';
import {
	GmailApiClient,
	GOOGLE_OAUTH_REDIRECT_URI,
	buildGoogleAuthorizationUrl,
	buildRawEmail,
	exchangeGoogleAuthorizationCode,
	mergeGoogleOAuthCredential,
	projectGmailMessage,
	projectGmailMessageWithBody,
	refreshGoogleAccessToken,
	scopesForGmailTools,
	type FetchLike,
} from './google';

const GOOGLE_CONNECTOR_IDS = new Set(['connector_gmail']);
const GOOGLE_OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

interface ConnectorsServiceOptions {
	fetchImpl?: FetchLike;
	openExternal?: (url: string) => Promise<void>;
	oauthRedirectUri?: string;
	oauthTimeoutMs?: number;
}

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function knownTools(connector: ConnectorConfig): ConnectorTool[] {
	const catalog = getConnectorCatalogItem(connector.connectorId);
	const allowed = new Set(connector.allowedTools);
	const names = catalog?.tools.filter((tool) => allowed.size === 0 || allowed.has(tool)) ?? [];

	return names.map((name) => ({
		name,
		requiresApproval: requiresApprovalForTool(connector, name),
	}));
}

function statusFor(connector: ConnectorConfig): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (isGoogleConnector(connector.connectorId)) {
		return connector.oauth?.refreshToken || connector.oauth?.accessToken ? 'configured' : 'missing_auth';
	}
	if (!connector.authorization?.trim()) return 'missing_auth';
	return 'configured';
}

function toView(connector: ConnectorConfig): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: isGoogleConnector(connector.connectorId) ? 'google_oauth' : 'manual_oauth_access_token',
		serverLabel: connector.serverLabel,
		enabled: connector.enabled,
		status: statusFor(connector),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
		connectedAccount: connector.oauth?.email,
	};
}

function sanitizeInput(input: ConnectorInput, current?: ConnectorConfig): ConnectorInput {
	const name = input.name.trim();
	const connectorId = input.connectorId.trim();
	const authorization = input.authorization?.trim() ?? '';
	const serverLabel = input.serverLabel?.trim() || serverLabelFromName(name);
	const serverDescription = input.serverDescription?.trim();

	if (!name) throw new Error('Connector name is required.');
	if (!isOpenAiConnectorId(connectorId)) throw new Error(`Unsupported connector id: ${connectorId}`);
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}

	const catalog = getConnectorCatalogItem(connectorId);
	const knownToolNames = new Set<string>(catalog?.tools ?? []);
	const allowedTools = Array.from(
		new Set((input.allowedTools ?? []).map((tool) => tool.trim()).filter(Boolean))
	);
	const unknownTool = allowedTools.find((tool) => !knownToolNames.has(tool));
	if (unknownTool) {
		throw new Error(`Tool "${unknownTool}" is not available for ${catalog?.name ?? connectorId}.`);
	}

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription: serverDescription || catalog?.description,
		authorization,
		oauthClientId: input.oauthClientId?.trim() || current?.oauth?.clientId,
		oauthClientSecret: input.oauthClientSecret?.trim() || current?.oauth?.clientSecret,
		requireApproval: input.requireApproval ?? 'always',
		allowedTools,
		deferLoading: input.deferLoading ?? false,
		enabled: input.enabled ?? true,
	};
}

export class ConnectorsService {
	constructor(
		private readonly store: StoreService,
		private readonly logger: LoggerService,
		private readonly options: ConnectorsServiceOptions = {}
	) {}

	catalog(): typeof OPENAI_CONNECTOR_CATALOG {
		return OPENAI_CONNECTOR_CATALOG;
	}

	list(): ConnectorView[] {
		return this.validConnectors().map(toView);
	}

	get(id: string): ConnectorConfig {
		const connector = this.getStored(id);
		return redactConnectorSecrets(connector);
	}

	private getStored(id: string): ConnectorConfig {
		const connector = this.validConnectors().find((item) => item.id === id);
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return connector;
	}

	restoreEnabledConnectors(): void {
		const validConnectors = this.validConnectors();
		if (validConnectors.length !== this.store.getConnectors().length) {
			this.store.setConnectors(validConnectors);
		}

		for (const connector of validConnectors) {
			if (connector.enabled && connector.tools.length === 0) {
				this.replace({
					...connector,
					tools: knownTools(connector),
					lastRefreshedAt: new Date().toISOString(),
				});
			}
		}
	}

	async add(input: ConnectorInput): Promise<ConnectorConfig> {
		const sanitized = sanitizeInput(input);
		const now = new Date().toISOString();
		const connector: ConnectorConfig = {
			id: randomUUID(),
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			authorization: sanitized.authorization ?? '',
			oauth: buildOAuthConfig(sanitized, undefined, this.oauthRedirectUri()),
			requireApproval: sanitized.requireApproval ?? 'always',
			allowedTools: sanitized.allowedTools ?? [],
			deferLoading: sanitized.deferLoading ?? false,
			tools: [],
			createdAt: now,
			updatedAt: now,
			enabled: sanitized.enabled ?? true,
		};
		const next = this.withKnownTools(connector);
		this.store.setConnectors([...this.store.getConnectors(), next]);
		return redactConnectorSecrets(next);
	}

	async update(id: string, input: ConnectorUpdateInput): Promise<ConnectorConfig> {
		const current = this.getStored(id);
		const merged = sanitizeInput({
			name: input.name ?? current.name,
			connectorId: input.connectorId ?? current.connectorId,
			serverLabel: input.serverLabel ?? current.serverLabel,
			serverDescription: input.serverDescription ?? current.serverDescription,
			authorization: input.authorization ?? current.authorization,
			requireApproval: input.requireApproval ?? current.requireApproval,
			allowedTools: input.allowedTools ?? current.allowedTools,
			deferLoading: input.deferLoading ?? current.deferLoading,
			enabled: input.enabled ?? current.enabled,
			oauthClientId: input.oauthClientId ?? current.oauth?.clientId,
			oauthClientSecret: input.oauthClientSecret ?? current.oauth?.clientSecret,
		}, current);
		const next = this.withKnownTools({
			...current,
			...merged,
			oauth: buildOAuthConfig(merged, current.oauth, this.oauthRedirectUri()),
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		});
		this.replace(next);
		return redactConnectorSecrets(next);
	}

	async remove(id: string): Promise<void> {
		this.store.setConnectors(this.store.getConnectors().filter((connector) => connector.id !== id));
	}

	async enable(id: string): Promise<ConnectorConfig> {
		return this.update(id, { enabled: true });
	}

	async disable(id: string): Promise<ConnectorConfig> {
		return this.update(id, { enabled: false });
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.getStored(id);
		const status = statusFor(connector);

		if (status === 'configured') {
			return {
				status,
				message: isGoogleConnector(connector.connectorId)
					? `Google connector is connected${connector.oauth?.email ? ` as ${connector.oauth.email}` : ''}.`
					: 'Connector is configured for Responses API requests.',
			};
		}

		if (status === 'missing_auth') {
			return {
				status,
				message: isGoogleConnector(connector.connectorId)
					? 'Google OAuth connection is required for this connector.'
					: 'OAuth access token is required for this connector.',
			};
		}

		if (status === 'disabled') {
			return { status, message: 'Connector is disabled.' };
		}

		return { status, message: connector.lastError ?? 'Connector has a configuration error.' };
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		return this.test(id);
	}

	async connectOAuth(id: string): Promise<ConnectorOAuthConnectResult> {
		const connector = this.getStored(id);
		if (!isGoogleConnector(connector.connectorId)) {
			throw new Error(`Connector ${connector.connectorId} does not support local OAuth connection.`);
		}
		const oauth = this.requireGoogleOAuthConfig(connector);
		const state = randomUUID();
		const scopes = scopesForGmailTools(knownTools(connector).map((tool) => tool.name));
		const authorizationUrl = buildGoogleAuthorizationUrl({
			clientId: oauth.clientId,
			redirectUri: oauth.redirectUri,
			state,
			scopes,
		});
		const callback = await this.waitForOAuthCallback(state);
		await (this.options.openExternal ?? shell.openExternal)(authorizationUrl);
		const { code } = await callback;
		const token = await exchangeGoogleAuthorizationCode({
			code,
			clientId: oauth.clientId,
			clientSecret: oauth.clientSecret,
			redirectUri: oauth.redirectUri,
			fetchImpl: this.fetchImpl(),
		});
		const connected = mergeGoogleOAuthCredential(oauth, token);
		const profile = await new GmailApiClient(connected.accessToken!, this.fetchImpl()).getProfile();
		const next = this.withKnownTools({
			...connector,
			oauth: {
				...connected,
				email: profile.emailAddress,
				connectedAt: new Date().toISOString(),
			},
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		});
		this.replace(next);
		return {
			status: 'configured',
			message: `Connected Google account${profile.emailAddress ? ` ${profile.emailAddress}` : ''}.`,
			connectedAccount: profile.emailAddress,
		};
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.withKnownTools(this.getStored(id));
		this.replace(connector);
		return connector.tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.getStored(id).tools;
	}

	async callTool(
		id?: string,
		name?: string,
		args?: unknown,
		_options?: unknown
	): Promise<unknown> {
		if (!id) throw new Error('Connector id is required.');
		if (!name) throw new Error('Connector tool name is required.');
		const connector = this.getStored(id);
		if (statusFor(connector) !== 'configured') {
			throw new Error(`Connector is not configured: ${connector.name}`);
		}
		if (!connector.tools.some((tool) => tool.name === name)) {
			throw new Error(`Tool ${name} is not enabled for ${connector.name}.`);
		}
		if (connector.connectorId === 'connector_gmail') {
			return this.callGmailTool(connector, name, args);
		}
		throw new Error(`Local execution is not implemented for ${connector.connectorId}.`);
	}

	createAgentTools(): AgentTool[] {
		return this.validConnectors()
			.filter((connector) => connector.enabled && statusFor(connector) === 'configured')
			.flatMap((connector) =>
				connector.tools.map((tool) => {
					const rawToolName = tool.name;
					const agentToolName = agentToolNameFor(connector, rawToolName);
					return {
						name: agentToolName,
						description: `${connector.name}: ${descriptionForTool(rawToolName)}`,
						schema: schemaForTool(rawToolName),
						needsApproval: (_args: unknown, _ctx: ToolContext) =>
							requiresApprovalForTool(connector, rawToolName),
						execute: async (args: unknown) => {
							try {
								const payload = await this.callTool(connector.id, rawToolName, args);
								return textResult(JSON.stringify(payload, null, 2));
							} catch (error) {
								return textResult(
									error instanceof Error ? error.message : String(error),
									true
								);
							}
						},
					} satisfies AgentTool;
				})
			);
	}

	private withKnownTools(connector: ConnectorConfig): ConnectorConfig {
		return {
			...connector,
			tools: knownTools(connector),
			lastRefreshedAt: new Date().toISOString(),
		};
	}

	private validConnectors(): ConnectorConfig[] {
		return this.store.getConnectors().filter((connector) => {
			return (
				typeof connector.id === 'string' &&
				typeof connector.name === 'string' &&
				typeof connector.connectorId === 'string' &&
				isOpenAiConnectorId(connector.connectorId)
			);
		});
	}

	private replace(connector: ConnectorConfig): void {
		this.logger.debug('ConnectorsService', `Updated connector ${connector.name}`);
		this.store.setConnectors(
			this.store.getConnectors().map((item) => (item.id === connector.id ? connector : item))
		);
	}

	private async callGmailTool(
		connector: ConnectorConfig,
		name: string,
		args: unknown
	): Promise<unknown> {
		const gmail = new GmailApiClient(await this.getGoogleAccessToken(connector), this.fetchImpl());
		const params = paramsRecord(args);
		switch (name) {
			case 'get_profile':
				return gmail.getProfile();
			case 'search_email_ids': {
				const listed = await gmail.listMessages({
					query: readString(params, 'query'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					labelIds: readStringList(params, 'labelIds'),
					includeSpamTrash: readBoolean(params, 'includeSpamTrash'),
				});
				return {
					...listed,
					messages: (listed.messages ?? []).map((message) => ({
						id: message.id,
						threadId: message.threadId,
					})),
				};
			}
			case 'get_recent_emails':
			case 'search_emails': {
				const listed = await gmail.listMessages({
					query: name === 'search_emails' ? readString(params, 'query') : undefined,
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					labelIds: readStringList(params, 'labelIds'),
					includeSpamTrash: readBoolean(params, 'includeSpamTrash'),
				});
				const messages = await Promise.all(
					(listed.messages ?? []).slice(0, 10).flatMap((message) =>
						message.id
							? [
									gmail
										.getMessage(message.id, 'metadata', ['From', 'To', 'Subject', 'Date'])
										.then(projectGmailMessage),
								]
							: []
					)
				);
				return { ...listed, messages };
			}
			case 'read_email': {
				const id = readRequiredMessageId(params);
				return projectGmailMessageWithBody(await gmail.getMessage(id, 'full'));
			}
			case 'batch_read_email': {
				const ids = readStringList(params, 'ids') ?? [];
				if (ids.length === 0) throw new Error('ids must include at least one message id.');
				return {
					messages: await Promise.all(
						ids.slice(0, 10).map((id) => gmail.getMessage(id, 'full').then(projectGmailMessageWithBody))
					),
				};
			}
			case 'create_draft':
				return gmail.createDraft(buildRawEmail(readEmailDraftParams(params)));
			case 'send_email':
				return gmail.sendMessage(buildRawEmail(readEmailDraftParams(params)));
			case 'trash_email':
				return gmail.trashMessage(readRequiredMessageId(params));
			default:
				throw new Error(`Unsupported Gmail tool: ${name}`);
		}
	}

	private async getGoogleAccessToken(connector: ConnectorConfig): Promise<string> {
		const oauth = this.requireGoogleOAuthConfig(connector);
		if (oauth.accessToken && (oauth.expiresAt ?? 0) > Date.now() + 60_000) {
			return oauth.accessToken;
		}
		if (!oauth.refreshToken) {
			if (oauth.accessToken) return oauth.accessToken;
			throw new Error(`Google connector ${connector.name} is missing a refresh token. Reconnect it.`);
		}
		const token = await refreshGoogleAccessToken({
			clientId: oauth.clientId,
			clientSecret: oauth.clientSecret,
			refreshToken: oauth.refreshToken,
			fetchImpl: this.fetchImpl(),
		});
		const next = {
			...connector,
			oauth: mergeGoogleOAuthCredential(oauth, token),
			updatedAt: new Date().toISOString(),
			lastError: undefined,
		};
		this.replace(next);
		return next.oauth.accessToken!;
	}

	private requireGoogleOAuthConfig(connector: ConnectorConfig): GoogleOAuthCredential {
		const oauth = connector.oauth;
		const clientId = oauth?.clientId || process.env.GOOGLE_OAUTH_CLIENT_ID;
		const clientSecret = oauth?.clientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
		if (!clientId) throw new Error('Google OAuth client ID is required.');
		return {
			provider: 'google',
			redirectUri: oauth?.redirectUri || this.oauthRedirectUri(),
			...oauth,
			clientId,
			clientSecret,
		};
	}

	private waitForOAuthCallback(expectedState: string): Promise<Promise<{ code: string }>> {
		const redirectUri = new URL(this.oauthRedirectUri());
		const port = Number(redirectUri.port);
		let server: Server | null = null;
		const callback = new Promise<{ code: string }>((resolve, reject) => {
			const timeout = setTimeout(() => {
				server?.close();
				reject(new Error('Google OAuth timed out before authorization completed.'));
			}, this.options.oauthTimeoutMs ?? GOOGLE_OAUTH_TIMEOUT_MS);
			server = createServer((request, response) => {
				try {
					const requestUrl = new URL(request.url ?? '/', this.oauthRedirectUri());
					if (requestUrl.pathname !== redirectUri.pathname) {
						response.writeHead(404);
						response.end('Not found');
						return;
					}
					const state = requestUrl.searchParams.get('state');
					const code = requestUrl.searchParams.get('code');
					const error = requestUrl.searchParams.get('error');
					if (state !== expectedState) {
						response.writeHead(400);
						response.end('OAuth state mismatch. You can close this tab.');
						return;
					}
					if (error) throw new Error(`Google OAuth failed: ${error}`);
					if (!code) throw new Error('Google OAuth did not return an authorization code.');
					response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
					response.end('<p>Google connector connected. You can close this tab.</p>');
					clearTimeout(timeout);
					server?.close();
					resolve({ code });
				} catch (error) {
					clearTimeout(timeout);
					server?.close();
					response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
					response.end(error instanceof Error ? error.message : String(error));
					reject(error);
				}
			});
			server.once('error', (error) => {
				clearTimeout(timeout);
				reject(error);
			});
		});
		return new Promise((resolve, reject) => {
			server?.once('error', reject);
			server?.listen(port, redirectUri.hostname, () => resolve(callback));
		});
	}

	private fetchImpl(): FetchLike {
		return this.options.fetchImpl ?? fetch;
	}

	private oauthRedirectUri(): string {
		return this.options.oauthRedirectUri ?? GOOGLE_OAUTH_REDIRECT_URI;
	}
}

function isGoogleConnector(connectorId: string): boolean {
	return GOOGLE_CONNECTOR_IDS.has(connectorId);
}

function buildOAuthConfig(
	input: ConnectorInput,
	current: GoogleOAuthCredential | undefined,
	redirectUri: string
): GoogleOAuthCredential | undefined {
	if (!isGoogleConnector(input.connectorId)) return current;
	const clientId = input.oauthClientId?.trim() || current?.clientId;
	const clientSecret = input.oauthClientSecret?.trim() || current?.clientSecret;
	if (!clientId) return current;
	return {
		provider: 'google',
		redirectUri: current?.redirectUri || redirectUri,
		...current,
		clientId,
		clientSecret,
	};
}

function redactConnectorSecrets(connector: ConnectorConfig): ConnectorConfig {
	if (!connector.oauth) return { ...connector };
	const { accessToken: _accessToken, refreshToken: _refreshToken, clientSecret, ...oauth } = connector.oauth;
	return {
		...connector,
		oauth: {
			...oauth,
			clientSecret: clientSecret ? '' : undefined,
		},
	};
}

function requiresApprovalForTool(connector: ConnectorConfig, toolName: string): boolean {
	if (connector.requireApproval === 'always') return true;
	if (connector.requireApproval === 'never') return false;
	const allowed = new Set(connector.allowedTools);
	if (connector.requireApproval === 'never_for_allowed_tools' && allowed.size > 0 && !allowed.has(toolName)) {
		return true;
	}
	return ['create_draft', 'send_email', 'trash_email'].includes(toolName);
}

function agentToolNameFor(connector: ConnectorConfig, toolName: string): string {
	return `${connector.serverLabel}_${toolName}`
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function paramsRecord(value: unknown): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
	return {};
}

function readString(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function readNumber(params: Record<string, unknown>, key: string): number | undefined {
	const value = params[key];
	if (value === undefined || value === null || value === '') return undefined;
	const numberValue = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numberValue)) throw new Error(`${key} must be a number.`);
	return numberValue;
}

function readBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
		return value.toLowerCase() === 'true';
	}
	throw new Error(`${key} must be a boolean.`);
}

function readStringList(params: Record<string, unknown>, key: string): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (Array.isArray(value)) {
		const values = value.map((entry) => String(entry).trim()).filter(Boolean);
		return values.length > 0 ? values : undefined;
	}
	if (typeof value === 'string') {
		const values = value.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
		return values.length > 0 ? values : undefined;
	}
	throw new Error(`${key} must be an array of strings or a comma-separated string.`);
}

function readRequiredMessageId(params: Record<string, unknown>): string {
	const id = readString(params, 'id') ?? readString(params, 'messageId');
	if (!id) throw new Error('A message id is required.');
	return id;
}

function readEmailDraftParams(params: Record<string, unknown>): {
	to: string[];
	subject: string;
	body: string;
	cc?: string[];
	bcc?: string[];
	isHtml?: boolean;
} {
	const to = readStringList(params, 'to') ?? [];
	const subject = readString(params, 'subject');
	const body = readString(params, 'body');
	if (to.length === 0) throw new Error('to must include at least one recipient.');
	if (!subject) throw new Error('subject is required.');
	if (!body) throw new Error('body is required.');
	return {
		to,
		subject,
		body,
		cc: readStringList(params, 'cc'),
		bcc: readStringList(params, 'bcc'),
		isHtml: readBoolean(params, 'isHtml') ?? false,
	};
}

function descriptionForTool(toolName: string): string {
	const descriptions: Record<string, string> = {
		get_profile: 'Get the connected Gmail profile.',
		search_emails: 'Search Gmail messages using Gmail search syntax.',
		search_email_ids: 'Search Gmail and return matching message ids.',
		get_recent_emails: 'List recent Gmail messages.',
		read_email: 'Read a Gmail message by id.',
		batch_read_email: 'Read up to 10 Gmail messages by id.',
		create_draft: 'Create a Gmail draft without sending it.',
		send_email: 'Send a Gmail email.',
		trash_email: 'Move a Gmail message to trash.',
	};
	return descriptions[toolName] ?? `Run ${toolName}.`;
}

function schemaForTool(toolName: string): AgentTool['schema'] {
	if (toolName === 'get_profile') {
		return { type: 'object', properties: {}, additionalProperties: false };
	}
	if (['search_emails', 'search_email_ids'].includes(toolName)) {
		return {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'Gmail search query.' },
				maxResults: { type: 'integer', description: 'Maximum messages to return, capped at 20.' },
				pageToken: { type: 'string' },
				labelIds: { type: 'array', items: { type: 'string' } },
				includeSpamTrash: { type: 'boolean' },
			},
			additionalProperties: false,
		};
	}
	if (toolName === 'get_recent_emails') {
		return {
			type: 'object',
			properties: {
				maxResults: { type: 'integer', description: 'Maximum messages to return, capped at 20.' },
				labelIds: { type: 'array', items: { type: 'string' } },
				includeSpamTrash: { type: 'boolean' },
			},
			additionalProperties: false,
		};
	}
	if (toolName === 'batch_read_email') {
		return {
			type: 'object',
			properties: { ids: { type: 'array', items: { type: 'string' } } },
			required: ['ids'],
			additionalProperties: false,
		};
	}
	if (['create_draft', 'send_email'].includes(toolName)) {
		return {
			type: 'object',
			properties: {
				to: { type: 'array', items: { type: 'string' } },
				cc: { type: 'array', items: { type: 'string' } },
				bcc: { type: 'array', items: { type: 'string' } },
				subject: { type: 'string' },
				body: { type: 'string' },
				isHtml: { type: 'boolean' },
			},
			required: ['to', 'subject', 'body'],
			additionalProperties: false,
		};
	}
	return {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'Gmail message id.' },
			messageId: { type: 'string', description: 'Gmail message id.' },
		},
		additionalProperties: false,
	};
}
