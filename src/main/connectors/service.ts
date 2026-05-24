import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { shell } from 'electron';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';
import type { AgentTool, ToolContext } from '../tools/types';
import { textResult } from '../tools/types';
import {
	OPENAI_CONNECTOR_CATALOG,
	getConnectorAuthKind,
	getConnectorCatalogItem,
	isOpenAiConnectorId,
	type ConnectorConfig,
	type ConnectorInput,
	type ConnectorOAuthConnectResult,
	type ConnectorStatus,
	type ConnectorTestResult,
	type ConnectorTool,
	type ConnectorView,
	type GoogleOAuthCredential,
	type OpenAiConnectorId,
} from '../../shared/connector';
import {
	GoogleCalendarApiClient,
	GoogleDriveApiClient,
	GoogleProfileClient,
	GmailApiClient,
	GOOGLE_OAUTH_REDIRECT_URI,
	buildGoogleAuthorizationUrl,
	buildRawEmail,
	createGooglePkcePair,
	exchangeGoogleAuthorizationCode,
	mergeGoogleOAuthCredential,
	projectGoogleCalendarEvent,
	projectGoogleCalendarListEntry,
	projectGoogleDriveFile,
	projectGoogleDrivePermission,
	projectGmailMessage,
	projectGmailMessageWithBody,
	refreshGoogleAccessToken,
	scopesForGoogleConnectorTools,
	type FetchLike,
	type GoogleCalendarEvent,
} from './google';

const GOOGLE_CONNECTOR_IDS = new Set(['connector_gmail', 'connector_googlecalendar', 'connector_googledrive']);
const GOOGLE_OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const GOOGLE_OAUTH_LOOPBACK_HOST = '127.0.0.1';

type GoogleOAuthRuntimeCredential = GoogleOAuthCredential & { clientId: string };

interface OAuthLoopbackServer {
	redirectUri: string;
	callback: Promise<{ code: string }>;
	close: () => void;
}

interface ConnectorsServiceOptions {
	fetchImpl?: FetchLike;
	openExternal?: (url: string) => Promise<void>;
	createOAuthLoopbackServer?: (expectedState: string) => Promise<OAuthLoopbackServer>;
	oauthRedirectUri?: string;
	oauthTimeoutMs?: number;
	googleOAuthClientId?: string;
	googleOAuthClientSecret?: string;
}

interface ConnectorRuntimeStrategy {
	readonly connectorId: OpenAiConnectorId;
	listTools(connector: ConnectorConfig): ConnectorTool[];
	callTool(connector: ConnectorConfig, name: string, args: unknown): Promise<unknown>;
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
		description: descriptionForTool(connector, name),
		inputSchema: schemaForTool(connector, name),
		requiresApproval: requiresApprovalForTool(connector, name),
	}));
}

function dedupeByConnectorId(connectors: ConnectorConfig[]): ConnectorConfig[] {
	const seen = new Set<string>();
	return connectors.filter((connector) => {
		if (seen.has(connector.connectorId)) return false;
		seen.add(connector.connectorId);
		return true;
	});
}

function statusFor(connector: ConnectorConfig): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (isGoogleConnector(connector.connectorId)) {
		return connector.oauth?.refreshToken || connector.oauth?.accessToken || connector.authorization?.trim()
			? 'configured'
			: 'missing_auth';
	}
	if (!connector.authorization?.trim()) return 'missing_auth';
	return 'configured';
}

function toView(connector: ConnectorConfig): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: getConnectorAuthKind(connector.connectorId),
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

function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`${label} is required.`);
}

function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	return value;
}

function readOptionalBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean.`);
	return value;
}

function readOptionalStringArray(params: Record<string, unknown>, key: string): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(`${key} must be an array of strings.`);
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

function readOptionalApprovalMode(
	params: Record<string, unknown>,
	key: string
): ConnectorInput['requireApproval'] | undefined {
	const value = readOptionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'always' || value === 'never' || value === 'never_for_allowed_tools') return value;
	throw new Error(`${key} must be one of: always, never, never_for_allowed_tools.`);
}

function sanitizeInput(input: unknown): ConnectorInput {
	const raw = requireObject(input, 'Connector configuration');
	const name = readOptionalString(raw, 'name')?.trim() ?? '';
	const connectorId = readOptionalString(raw, 'connectorId')?.trim() ?? '';
	const authorization = readOptionalString(raw, 'authorization')?.trim() ?? '';
	const serverLabel = readOptionalString(raw, 'serverLabel')?.trim() || serverLabelFromName(name);
	const serverDescription = readOptionalString(raw, 'serverDescription')?.trim();
	const requireApproval = readOptionalApprovalMode(raw, 'requireApproval') ?? 'always';
	const allowedTools = readOptionalStringArray(raw, 'allowedTools') ?? [];
	const deferLoading = readOptionalBoolean(raw, 'deferLoading') ?? false;
	const enabled = readOptionalBoolean(raw, 'enabled') ?? true;

	if (!name) throw new Error('Connector name is required.');
	if (!isOpenAiConnectorId(connectorId)) throw new Error(`Unsupported connector id: ${connectorId}`);
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}

	const catalog = getConnectorCatalogItem(connectorId);
	const knownToolNames = new Set<string>(catalog?.tools ?? []);
	const uniqueAllowedTools = Array.from(new Set(allowedTools.map((tool) => tool.trim()).filter(Boolean)));
	const unknownTool = uniqueAllowedTools.find((tool) => !knownToolNames.has(tool));
	if (unknownTool) {
		throw new Error(`Tool "${unknownTool}" is not available for ${catalog?.name ?? connectorId}.`);
	}

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription: serverDescription || catalog?.description,
		authorization,
		requireApproval,
		allowedTools: uniqueAllowedTools,
		deferLoading,
		enabled,
	};
}

export class ConnectorsService {
	private readonly runtimeStrategies: Partial<Record<OpenAiConnectorId, ConnectorRuntimeStrategy>> = {
		connector_gmail: {
			connectorId: 'connector_gmail',
			listTools: knownTools,
			callTool: (connector, name, args) => this.callGmailTool(connector, name, args),
		},
		connector_googlecalendar: {
			connectorId: 'connector_googlecalendar',
			listTools: knownTools,
			callTool: (connector, name, args) => this.callGoogleCalendarTool(connector, name, args),
		},
		connector_googledrive: {
			connectorId: 'connector_googledrive',
			listTools: knownTools,
			callTool: (connector, name, args) => this.callGoogleDriveTool(connector, name, args),
		},
	};

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

	async add(input: unknown): Promise<ConnectorConfig> {
		const sanitized = sanitizeInput(input);
		if (this.store.getConnectors().some((connector) => connector.connectorId === sanitized.connectorId)) {
			throw new Error(`Connector ${sanitized.connectorId} is already configured.`);
		}
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

	async update(id: string, input: unknown): Promise<ConnectorConfig> {
		const current = this.getStored(id);
		const patch = requireObject(input, 'Connector update');
		const merged = sanitizeInput({
			name: readOptionalString(patch, 'name') ?? current.name,
			connectorId: readOptionalString(patch, 'connectorId') ?? current.connectorId,
			serverLabel: readOptionalString(patch, 'serverLabel') ?? current.serverLabel,
			serverDescription: readOptionalString(patch, 'serverDescription') ?? current.serverDescription,
			authorization: readOptionalString(patch, 'authorization') ?? current.authorization,
			requireApproval: readOptionalApprovalMode(patch, 'requireApproval') ?? current.requireApproval,
			allowedTools: readOptionalStringArray(patch, 'allowedTools') ?? current.allowedTools,
			deferLoading: readOptionalBoolean(patch, 'deferLoading') ?? current.deferLoading,
			enabled: readOptionalBoolean(patch, 'enabled') ?? current.enabled,
		});
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
			const runtime = this.runtimeFor(connector);
			return {
				status,
				message: runtime
					? `Connector is configured for local agent tool execution.`
					: isGoogleConnector(connector.connectorId)
					? `Google connector is connected${connector.oauth?.email ? ` as ${connector.oauth.email}` : ''}.`
					: 'Connector is configured for catalog/provider-hosted use. Local agent execution is not implemented.',
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
		const scopes = scopesForGoogleConnectorTools(
			connector.connectorId,
			knownTools(connector).map((tool) => tool.name)
		);
		const pkce = createGooglePkcePair();
		const loopback = await this.openOAuthLoopbackServer(state);
		const authorizationUrl = buildGoogleAuthorizationUrl({
			clientId: oauth.clientId,
			redirectUri: loopback.redirectUri,
			state,
			scopes,
			codeChallenge: pkce.codeChallenge,
			codeChallengeMethod: pkce.codeChallengeMethod,
		});
		try {
			this.logger.info('ConnectorsService', `Opening Google OAuth consent for ${connector.name}`);
			if (this.options.openExternal) {
				await this.options.openExternal(authorizationUrl);
			} else {
				await shell.openExternal(authorizationUrl, { activate: true });
			}
			const { code } = await loopback.callback;
			const token = await exchangeGoogleAuthorizationCode({
				code,
				clientId: oauth.clientId,
				clientSecret: oauth.clientSecret,
				redirectUri: loopback.redirectUri,
				codeVerifier: pkce.codeVerifier,
				fetchImpl: this.fetchImpl(),
			});
			const connected = mergeGoogleOAuthCredential({ ...oauth, redirectUri: loopback.redirectUri }, token);
			const profile = await new GoogleProfileClient(connected.accessToken!, this.fetchImpl()).getUserInfo();
			const next = this.withKnownTools({
				...connector,
				oauth: stripGoogleOAuthClientCredentials({
					...connected,
					email: profile.email,
					connectedAt: new Date().toISOString(),
				}),
				lastError: undefined,
				updatedAt: new Date().toISOString(),
			});
			this.replace(next);
			return {
				status: 'configured',
				message: `Connected Google account${profile.email ? ` ${profile.email}` : ''}.`,
				connectedAccount: profile.email,
			};
		} finally {
			loopback.close();
		}
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
		const strategy = this.runtimeFor(connector);
		if (!strategy) {
			throw new Error(`Connector is catalog-only in local runtime: ${connector.connectorId}.`);
		}
		if (!connector.tools.some((tool) => tool.name === name)) {
			throw new Error(`Tool ${name} is not enabled for ${connector.name}.`);
		}
		return strategy.callTool(connector, name, args);
	}

	createAgentTools(): AgentTool[] {
		return this.validConnectors()
			.filter(
				(connector) =>
					connector.enabled &&
					statusFor(connector) === 'configured' &&
					this.runtimeFor(connector) !== undefined
			)
			.flatMap((connector) =>
				connector.tools.map((tool) => {
					const rawToolName = tool.name;
					const agentToolName = agentToolNameFor(connector, rawToolName);
					return {
						name: agentToolName,
						description: `${connector.name}: ${descriptionForTool(connector, rawToolName)}`,
						schema: schemaForTool(connector, rawToolName),
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
		const runtime = this.runtimeFor(connector);
		return {
			...connector,
			tools: runtime?.listTools(connector) ?? knownTools(connector),
			lastRefreshedAt: new Date().toISOString(),
		};
	}

	private runtimeFor(connector: ConnectorConfig): ConnectorRuntimeStrategy | undefined {
		return this.runtimeStrategies[connector.connectorId];
	}

	private validConnectors(): ConnectorConfig[] {
		return dedupeByConnectorId(
			this.store.getConnectors()
				.filter(isStoredConnectorValid)
				.map(normalizeStoredConnector)
		);
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

	private async callGoogleCalendarTool(
		connector: ConnectorConfig,
		name: string,
		args: unknown
	): Promise<unknown> {
		const calendar = new GoogleCalendarApiClient(await this.getGoogleAccessToken(connector), this.fetchImpl());
		const params = paramsRecord(args);
		switch (name) {
			case 'get_profile':
				return new GoogleProfileClient(await this.getGoogleAccessToken(connector), this.fetchImpl()).getUserInfo();
			case 'list_calendars': {
				const listed = await calendar.listCalendars({
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
				});
				return {
					...listed,
					items: (listed.items ?? []).map(projectGoogleCalendarListEntry),
				};
			}
			case 'search':
			case 'search_events': {
				const listed = await calendar.listEvents({
					calendarId: readCalendarId(params),
					query: readString(params, 'query'),
					timeMin: readString(params, 'timeMin'),
					timeMax: readString(params, 'timeMax'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					showDeleted: readBoolean(params, 'showDeleted'),
					singleEvents: readBoolean(params, 'singleEvents'),
					orderBy: readString(params, 'orderBy'),
				});
				return {
					...listed,
					items: (listed.items ?? []).map(projectGoogleCalendarEvent),
				};
			}
			case 'fetch':
			case 'read_event': {
				const { calendarId, eventId } = readEventLookupParams(params);
				return projectGoogleCalendarEvent(await calendar.getEvent(calendarId, eventId));
			}
			case 'create_event': {
				const calendarId = readCalendarId(params);
				return projectGoogleCalendarEvent(await calendar.createEvent(calendarId, readCalendarEventPayload(params, true)));
			}
			case 'update_event': {
				const { calendarId, eventId } = readEventLookupParams(params);
				return projectGoogleCalendarEvent(await calendar.updateEvent(calendarId, eventId, readCalendarEventPayload(params, false)));
			}
			case 'delete_event': {
				const { calendarId, eventId } = readEventLookupParams(params);
				return calendar.deleteEvent(calendarId, eventId);
			}
			default:
				throw new Error(`Unsupported Google Calendar tool: ${name}`);
		}
	}

	private async callGoogleDriveTool(
		connector: ConnectorConfig,
		name: string,
		args: unknown
	): Promise<unknown> {
		const accessToken = await this.getGoogleAccessToken(connector);
		const drive = new GoogleDriveApiClient(accessToken, this.fetchImpl());
		const params = paramsRecord(args);
		switch (name) {
			case 'get_profile':
				return new GoogleProfileClient(accessToken, this.fetchImpl()).getUserInfo();
			case 'list_drives':
				return drive.listDrives({
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
				});
			case 'search_files':
			case 'search': {
				const listed = await drive.searchFiles({
					query: readString(params, 'query') ?? readString(params, 'q'),
					driveQuery: readString(params, 'driveQuery'),
					mimeType: readString(params, 'mimeType'),
					driveId: readString(params, 'driveId'),
					corpora: readString(params, 'corpora'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					orderBy: readString(params, 'orderBy'),
				});
				return {
					...listed,
					files: (listed.files ?? []).map(projectGoogleDriveFile),
				};
			}
			case 'list_recent_files':
			case 'recent_documents': {
				const listed = await drive.searchFiles({
					mimeType: readString(params, 'mimeType'),
					driveId: readString(params, 'driveId'),
					corpora: readString(params, 'corpora'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					orderBy: 'modifiedTime desc',
				});
				return {
					...listed,
					files: (listed.files ?? []).map(projectGoogleDriveFile),
				};
			}
			case 'get_file_metadata':
				return projectGoogleDriveFile(await drive.getFile(readDriveFileId(params)));
			case 'get_file_permissions': {
				const listed = await drive.listPermissions({
					fileId: readDriveFileId(params),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
				});
				return {
					...listed,
					permissions: (listed.permissions ?? []).map(projectGoogleDrivePermission),
				};
			}
			case 'read_file_content':
			case 'download_file_content':
			case 'fetch': {
				const file = await drive.getFile(readDriveFileId(params));
				const content = await drive.getFileContent(
					file,
					readString(params, 'exportMimeType') ?? readString(params, 'mimeType')
				);
				return {
					...projectGoogleDriveFile(file),
					content: content.slice(0, 64 * 1024),
				};
			}
			case 'create_file':
				return projectGoogleDriveFile(await drive.createFile(readDriveCreateFileParams(params)));
			default:
				throw new Error(`Unsupported Google Drive tool: ${name}`);
		}
	}

	private async getGoogleAccessToken(connector: ConnectorConfig): Promise<string> {
		if (connector.authorization?.trim() && !connector.oauth?.refreshToken) {
			return connector.authorization.trim();
		}
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
		const nextOAuth = stripGoogleOAuthClientCredentials(mergeGoogleOAuthCredential(oauth, token));
		if (!nextOAuth?.accessToken) {
			throw new Error(`Google connector ${connector.name} did not return an access token.`);
		}
		const next = {
			...connector,
			oauth: nextOAuth,
			updatedAt: new Date().toISOString(),
			lastError: undefined,
		};
		this.replace(next);
		return nextOAuth.accessToken;
	}

	private requireGoogleOAuthConfig(connector: ConnectorConfig): GoogleOAuthRuntimeCredential {
		const oauth = stripGoogleOAuthClientCredentials(connector.oauth);
		const clientId =
			this.options.googleOAuthClientId ||
			process.env.GOOGLE_OAUTH_CLIENT_ID;
		const clientSecret =
			this.options.googleOAuthClientSecret ||
			process.env.GOOGLE_OAUTH_CLIENT_SECRET;
		if (!clientId || !clientSecret) {
			throw new Error(
				'Google OAuth client is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in the app environment.'
			);
		}
		return {
			provider: 'google',
			redirectUri: oauth?.redirectUri || this.oauthRedirectUri(),
			...oauth,
			clientId,
			clientSecret,
		};
	}

	private openOAuthLoopbackServer(expectedState: string): Promise<OAuthLoopbackServer> {
		if (this.options.createOAuthLoopbackServer) {
			return this.options.createOAuthLoopbackServer(expectedState);
		}
		const configuredRedirectUri = this.options.oauthRedirectUri
			? new URL(this.options.oauthRedirectUri)
			: undefined;
		const hostname = configuredRedirectUri?.hostname || GOOGLE_OAUTH_LOOPBACK_HOST;
		const port = configuredRedirectUri?.port ? Number(configuredRedirectUri.port) : 0;
		const pathname = configuredRedirectUri?.pathname || '/';
		let server: Server | null = null;
		let timeout: NodeJS.Timeout | null = null;
		let callbackSettled = false;
		let rejectCallback: (error: Error) => void = () => {};
		const close = (): void => {
			if (timeout) clearTimeout(timeout);
			server?.close();
			server = null;
		};
		const callback = new Promise<{ code: string }>((resolve, reject) => {
			timeout = setTimeout(() => {
				close();
				reject(new Error('Google OAuth timed out before authorization completed.'));
			}, this.options.oauthTimeoutMs ?? GOOGLE_OAUTH_TIMEOUT_MS);
			rejectCallback = reject;
			server = createServer((request, response) => {
				try {
					const requestUrl = new URL(request.url ?? '/', `http://${hostname}`);
					if (requestUrl.pathname !== pathname) {
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
					callbackSettled = true;
					close();
					resolve({ code });
				} catch (error) {
					callbackSettled = true;
					close();
					response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
					response.end(error instanceof Error ? error.message : String(error));
					reject(error);
				}
			});
		});
		return new Promise((resolve, reject) => {
			const rejectStartup = (error: Error): void => {
				close();
				reject(
					new Error(
						`Could not start the local Google OAuth callback server: ${
							error instanceof Error ? error.message : String(error)
						}`
					)
				);
			};
			server?.once('error', rejectStartup);
			server?.listen(port, hostname, () => {
				server?.off('error', rejectStartup);
				server?.on('error', (error) => {
					close();
					if (!callbackSettled) rejectCallback(error);
				});
				const address = server?.address();
				const actualPort = typeof address === 'object' && address ? address.port : port;
				const redirectUri = configuredRedirectUri
					? `${configuredRedirectUri.protocol}//${hostname}:${actualPort}${pathname === '/' ? '' : pathname}`
					: `http://${hostname}:${actualPort}`;
				resolve({ redirectUri, callback, close });
			});
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

function isStoredConnectorValid(connector: ConnectorConfig): boolean {
	return (
		typeof connector.id === 'string' &&
		typeof connector.name === 'string' &&
		typeof connector.connectorId === 'string' &&
		isOpenAiConnectorId(connector.connectorId)
	);
}

function normalizeStoredConnector(connector: ConnectorConfig): ConnectorConfig {
	if (!isGoogleConnector(connector.connectorId) || !connector.oauth) return connector;
	const oauth = stripGoogleOAuthClientCredentials(connector.oauth);
	return oauth === connector.oauth ? connector : { ...connector, oauth };
}

function buildOAuthConfig(
	input: ConnectorInput,
	current: GoogleOAuthCredential | undefined,
	redirectUri: string
): GoogleOAuthCredential | undefined {
	if (!isGoogleConnector(input.connectorId)) return undefined;
	const oauth = stripGoogleOAuthClientCredentials(current);
	return {
		provider: 'google',
		redirectUri: oauth?.redirectUri || redirectUri,
		...oauth,
	};
}

function stripGoogleOAuthClientCredentials(oauth: GoogleOAuthCredential | undefined): GoogleOAuthCredential | undefined {
	if (!oauth) return undefined;
	const { clientId: _clientId, clientSecret: _clientSecret, ...safeOAuth } = oauth;
	return safeOAuth;
}

function redactConnectorSecrets(connector: ConnectorConfig): ConnectorConfig {
	if (!connector.oauth) return { ...connector };
	const {
		accessToken: _accessToken,
		refreshToken: _refreshToken,
		clientId: _clientId,
		clientSecret: _clientSecret,
		...oauth
	} = connector.oauth;
	return {
		...connector,
		oauth,
	};
}

function requiresApprovalForTool(connector: ConnectorConfig, toolName: string): boolean {
	if (connector.connectorId !== 'connector_googledrive' || toolName !== 'create_file') return false;
	if (connector.requireApproval === 'never') return false;
	if (connector.requireApproval === 'never_for_allowed_tools' && connector.allowedTools.includes(toolName)) {
		return false;
	}
	return true;
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

function readText(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	return value;
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

function readCalendarId(params: Record<string, unknown>): string {
	return readString(params, 'calendarId') ?? 'primary';
}

function readEventLookupParams(params: Record<string, unknown>): { calendarId: string; eventId: string } {
	const eventId = readString(params, 'eventId') ?? readString(params, 'id');
	if (!eventId) throw new Error('An event id is required.');
	return { calendarId: readCalendarId(params), eventId };
}

function readDriveFileId(params: Record<string, unknown>): string {
	const id = readString(params, 'fileId') ?? readString(params, 'id');
	if (!id) throw new Error('A Google Drive file id is required.');
	return id;
}

function readDriveCreateFileParams(params: Record<string, unknown>): {
	name: string;
	mimeType?: string;
	content?: string;
	contentMimeType?: string;
	parents?: string[];
	description?: string;
} {
	const name = readString(params, 'name') ?? readString(params, 'fileName');
	if (!name) throw new Error('name is required.');
	const parentId = readString(params, 'parentId');
	return {
		name,
		mimeType: readString(params, 'mimeType'),
		content: readText(params, 'content') ?? readText(params, 'text'),
		contentMimeType: readString(params, 'contentMimeType'),
		parents: readStringList(params, 'parents') ?? (parentId ? [parentId] : undefined),
		description: readString(params, 'description'),
	};
}

function readCalendarDateTime(
	params: Record<string, unknown>,
	key: string,
	timeZone?: string
): GoogleCalendarEvent['start'] | undefined {
	const value = readString(params, key);
	if (!value) return undefined;
	const dateTime: GoogleCalendarEvent['start'] = /^\d{4}-\d{2}-\d{2}$/.test(value)
		? { date: value }
		: { dateTime: value };
	if (dateTime.dateTime && timeZone) dateTime.timeZone = timeZone;
	return dateTime;
}

function readCalendarEventPayload(
	params: Record<string, unknown>,
	requireCoreFields: boolean
): GoogleCalendarEvent {
	const timeZone = readString(params, 'timeZone');
	const summary = readString(params, 'summary') ?? readString(params, 'title');
	const start = readCalendarDateTime(params, 'start', timeZone);
	const end = readCalendarDateTime(params, 'end', timeZone);
	if (requireCoreFields && !summary) throw new Error('summary is required.');
	if (requireCoreFields && !start) throw new Error('start is required.');
	if (requireCoreFields && !end) throw new Error('end is required.');
	const payload: GoogleCalendarEvent = {};
	if (summary) payload.summary = summary;
	const description = readString(params, 'description');
	if (description) payload.description = description;
	const location = readString(params, 'location');
	if (location) payload.location = location;
	if (start) payload.start = start;
	if (end) payload.end = end;
	const attendees = readStringList(params, 'attendees');
	if (attendees) payload.attendees = attendees.map((email) => ({ email }));
	const recurrence = readStringList(params, 'recurrence');
	if (recurrence) payload.recurrence = recurrence;
	if (Object.keys(payload).length === 0) throw new Error('At least one event field is required.');
	return payload;
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

function descriptionForTool(connector: ConnectorConfig, toolName: string): string {
	const driveDescriptions: Record<string, string> = {
		get_profile: 'Get the connected Google account profile.',
		search_files: 'Search Google Drive files by name or content.',
		list_recent_files: 'List recently modified Google Drive files.',
		read_file_content: 'Read text content from a Google Drive file.',
		get_file_metadata: 'Get Google Drive file metadata by id.',
		get_file_permissions: 'List permissions for a Google Drive file or shared drive.',
		download_file_content: 'Download text content from a Google Drive file.',
		create_file: 'Create a Google Drive file.',
		list_drives: 'List shared drives available to the connected account.',
		search: 'Search Google Drive files by name or content. Legacy alias for search_files.',
		recent_documents: 'List recently modified Google Drive files. Legacy alias for list_recent_files.',
		fetch: 'Fetch Google Drive file metadata and text content. Legacy alias for read_file_content.',
	};
	const calendarDescriptions: Record<string, string> = {
		get_profile: 'Get the connected Google account profile.',
		list_calendars: 'List Google calendars available to the connected account.',
		search: 'Search Google Calendar events.',
		fetch: 'Read a Google Calendar event by id.',
		search_events: 'Search Google Calendar events by text and time range.',
		read_event: 'Read a Google Calendar event by id.',
		create_event: 'Create a Google Calendar event.',
		update_event: 'Update a Google Calendar event.',
		delete_event: 'Delete a Google Calendar event.',
	};
	const gmailDescriptions: Record<string, string> = {
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
	const descriptions = connector.connectorId === 'connector_googlecalendar'
		? calendarDescriptions
		: connector.connectorId === 'connector_googledrive'
			? driveDescriptions
			: gmailDescriptions;
	return descriptions[toolName] ?? `Run ${toolName}.`;
}

function schemaForTool(connector: ConnectorConfig, toolName: string): AgentTool['schema'] {
	if (toolName === 'get_profile') {
		return { type: 'object', properties: {}, additionalProperties: false };
	}
	if (connector.connectorId === 'connector_googlecalendar') {
		return schemaForGoogleCalendarTool(toolName);
	}
	if (connector.connectorId === 'connector_googledrive') {
		return schemaForGoogleDriveTool(toolName);
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

function schemaForGoogleDriveTool(toolName: string): AgentTool['schema'] {
	if (toolName === 'list_drives') {
		return {
			type: 'object',
			properties: {
				maxResults: { type: 'integer', description: 'Maximum shared drives to return, capped at 100.' },
				pageToken: { type: 'string' },
			},
			additionalProperties: false,
		};
	}
	if (['fetch', 'read_file_content', 'download_file_content'].includes(toolName)) {
		return {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Google Drive file id.' },
				fileId: { type: 'string', description: 'Google Drive file id.' },
				exportMimeType: { type: 'string', description: 'Export MIME type for Google Workspace files.' },
				mimeType: { type: 'string', description: 'Alias for exportMimeType on Google Workspace files.' },
			},
			additionalProperties: false,
		};
	}
	if (toolName === 'get_file_metadata') {
		return {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Google Drive file id.' },
				fileId: { type: 'string', description: 'Google Drive file id.' },
			},
			additionalProperties: false,
		};
	}
	if (toolName === 'get_file_permissions') {
		return {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Google Drive file or shared drive id.' },
				fileId: { type: 'string', description: 'Google Drive file or shared drive id.' },
				maxResults: { type: 'integer', description: 'Maximum permissions to return, capped at 100.' },
				pageToken: { type: 'string' },
			},
			additionalProperties: false,
		};
	}
	if (toolName === 'create_file') {
		return {
			type: 'object',
			properties: {
				name: { type: 'string', description: 'New file name.' },
				fileName: { type: 'string', description: 'Alias for name.' },
				mimeType: { type: 'string', description: 'Drive file MIME type. Defaults to text/plain.' },
				content: { type: 'string', description: 'Optional file content.' },
				text: { type: 'string', description: 'Alias for content.' },
				contentMimeType: { type: 'string', description: 'MIME type for uploaded content.' },
				parents: { type: 'array', items: { type: 'string' }, description: 'Parent folder ids.' },
				parentId: { type: 'string', description: 'Single parent folder id.' },
				description: { type: 'string' },
			},
			additionalProperties: false,
		};
	}
	return {
		type: 'object',
		properties: {
			query: { type: 'string', description: 'Search text matched against Drive file names and content.' },
			q: { type: 'string', description: 'Alias for query.' },
			driveQuery: { type: 'string', description: 'Raw Google Drive q expression for advanced searches.' },
			mimeType: { type: 'string', description: 'Restrict results to one MIME type.' },
			driveId: { type: 'string', description: 'Shared drive id to search.' },
			corpora: { type: 'string', description: 'Drive corpora value such as user, drive, domain, or allDrives.' },
			maxResults: { type: 'integer', description: 'Maximum files to return, capped at 20.' },
			pageToken: { type: 'string' },
			orderBy: { type: 'string', description: 'Google Drive orderBy expression.' },
		},
		additionalProperties: false,
	};
}

function schemaForGoogleCalendarTool(toolName: string): AgentTool['schema'] {
	if (toolName === 'list_calendars') {
		return {
			type: 'object',
			properties: {
				maxResults: { type: 'integer', description: 'Maximum calendars to return, capped at 50.' },
				pageToken: { type: 'string' },
			},
			additionalProperties: false,
		};
	}
	if (['search', 'search_events'].includes(toolName)) {
		return {
			type: 'object',
			properties: {
				calendarId: { type: 'string', description: 'Google Calendar id. Defaults to primary.' },
				query: { type: 'string', description: 'Free-text event search query.' },
				timeMin: { type: 'string', description: 'Lower event start bound as an RFC3339 timestamp.' },
				timeMax: { type: 'string', description: 'Upper event start bound as an RFC3339 timestamp.' },
				maxResults: { type: 'integer', description: 'Maximum events to return, capped at 20.' },
				pageToken: { type: 'string' },
				showDeleted: { type: 'boolean' },
				singleEvents: { type: 'boolean' },
				orderBy: { type: 'string', enum: ['startTime', 'updated'] },
			},
			additionalProperties: false,
		};
	}
	if (['fetch', 'read_event', 'delete_event'].includes(toolName)) {
		return {
			type: 'object',
			properties: {
				calendarId: { type: 'string', description: 'Google Calendar id. Defaults to primary.' },
				eventId: { type: 'string', description: 'Google Calendar event id.' },
				id: { type: 'string', description: 'Google Calendar event id.' },
			},
			additionalProperties: false,
		};
	}
	return {
		type: 'object',
		properties: {
			calendarId: { type: 'string', description: 'Google Calendar id. Defaults to primary.' },
			eventId: { type: 'string', description: 'Google Calendar event id, required for updates.' },
			id: { type: 'string', description: 'Google Calendar event id, accepted for updates.' },
			summary: { type: 'string' },
			title: { type: 'string', description: 'Alias for summary.' },
			description: { type: 'string' },
			location: { type: 'string' },
			start: { type: 'string', description: 'RFC3339 date-time or YYYY-MM-DD all-day date.' },
			end: { type: 'string', description: 'RFC3339 date-time or YYYY-MM-DD all-day date.' },
			timeZone: { type: 'string' },
			attendees: { type: 'array', items: { type: 'string' } },
			recurrence: { type: 'array', items: { type: 'string' } },
		},
		required: toolName === 'create_event' ? ['summary', 'start', 'end'] : ['eventId'],
		additionalProperties: false,
	};
}
