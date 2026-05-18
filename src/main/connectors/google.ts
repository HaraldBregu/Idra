import { createHash, randomBytes } from 'node:crypto';
import type { GoogleOAuthCredential } from '../../shared/connectors';

export const GOOGLE_OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
export const GOOGLE_GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
export const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const GOOGLE_OAUTH_REDIRECT_URI = 'http://127.0.0.1';

export const GOOGLE_GMAIL_SCOPES = {
	profile: [
		'https://www.googleapis.com/auth/userinfo.email',
		'https://www.googleapis.com/auth/userinfo.profile',
	],
	read: ['https://www.googleapis.com/auth/gmail.readonly'],
	compose: ['https://www.googleapis.com/auth/gmail.compose'],
	send: ['https://www.googleapis.com/auth/gmail.send'],
	modify: ['https://www.googleapis.com/auth/gmail.modify'],
} as const;

export const GOOGLE_CALENDAR_SCOPES = {
	profile: GOOGLE_GMAIL_SCOPES.profile,
	read: [
		'https://www.googleapis.com/auth/calendar.readonly',
		'https://www.googleapis.com/auth/calendar.events.readonly',
	],
	write: ['https://www.googleapis.com/auth/calendar.events'],
} as const;

export const GOOGLE_DRIVE_SCOPES = {
	profile: GOOGLE_GMAIL_SCOPES.profile,
	read: ['https://www.googleapis.com/auth/drive.readonly'],
	write: ['https://www.googleapis.com/auth/drive.file'],
} as const;

export type FetchLike = typeof fetch;

export interface GoogleTokenResponse {
	access_token: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
	token_type?: string;
}

export interface GooglePkcePair {
	codeVerifier: string;
	codeChallenge: string;
	codeChallengeMethod: 'S256';
}

export interface GmailProfile {
	emailAddress?: string;
	messagesTotal?: number;
	threadsTotal?: number;
	historyId?: string;
}

export interface GmailMessageHeader {
	name?: string;
	value?: string;
}

export interface GmailMessagePart {
	mimeType?: string;
	filename?: string;
	headers?: GmailMessageHeader[];
	body?: {
		data?: string;
		size?: number;
		attachmentId?: string;
	};
	parts?: GmailMessagePart[];
}

export interface GmailMessage {
	id?: string;
	threadId?: string;
	labelIds?: string[];
	snippet?: string;
	payload?: GmailMessagePart;
	sizeEstimate?: number;
	internalDate?: string;
	raw?: string;
}

export interface GmailListResponse {
	messages?: Array<{ id?: string; threadId?: string }>;
	nextPageToken?: string;
	resultSizeEstimate?: number;
}

export interface GmailDraftResponse {
	id?: string;
	message?: GmailMessage;
}

export interface GoogleUserInfo {
	email?: string;
	name?: string;
	picture?: string;
	sub?: string;
}

export interface GoogleCalendarListEntry {
	id?: string;
	summary?: string;
	description?: string;
	timeZone?: string;
	primary?: boolean;
	accessRole?: string;
	backgroundColor?: string;
	foregroundColor?: string;
	selected?: boolean;
}

export interface GoogleCalendarListResponse {
	items?: GoogleCalendarListEntry[];
	nextPageToken?: string;
	nextSyncToken?: string;
}

export interface GoogleCalendarEventDateTime {
	date?: string;
	dateTime?: string;
	timeZone?: string;
}

export interface GoogleCalendarEventAttendee {
	email?: string;
	displayName?: string;
	optional?: boolean;
	responseStatus?: string;
}

export interface GoogleCalendarEvent {
	id?: string;
	status?: string;
	htmlLink?: string;
	created?: string;
	updated?: string;
	summary?: string;
	description?: string;
	location?: string;
	start?: GoogleCalendarEventDateTime;
	end?: GoogleCalendarEventDateTime;
	creator?: { email?: string; displayName?: string; self?: boolean };
	organizer?: { email?: string; displayName?: string; self?: boolean };
	attendees?: GoogleCalendarEventAttendee[];
	recurrence?: string[];
	recurringEventId?: string;
}

export interface GoogleCalendarEventsResponse {
	items?: GoogleCalendarEvent[];
	nextPageToken?: string;
	nextSyncToken?: string;
	summary?: string;
	timeZone?: string;
	updated?: string;
}

export interface GoogleDriveOwner {
	displayName?: string;
	emailAddress?: string;
}

export interface GoogleDriveFile {
	id?: string;
	name?: string;
	mimeType?: string;
	webViewLink?: string;
	iconLink?: string;
	createdTime?: string;
	modifiedTime?: string;
	size?: string;
	owners?: GoogleDriveOwner[];
	driveId?: string;
	parents?: string[];
	trashed?: boolean;
}

export interface GoogleDriveFileListResponse {
	files?: GoogleDriveFile[];
	nextPageToken?: string;
}

export interface GoogleDriveEntry {
	id?: string;
	name?: string;
	kind?: string;
}

export interface GoogleDriveListResponse {
	drives?: GoogleDriveEntry[];
	nextPageToken?: string;
}

export interface GoogleDrivePermission {
	id?: string;
	type?: string;
	role?: string;
	emailAddress?: string;
	displayName?: string;
	domain?: string;
	allowFileDiscovery?: boolean;
	deleted?: boolean;
	pendingOwner?: boolean;
	photoLink?: string;
}

export interface GoogleDrivePermissionListResponse {
	permissions?: GoogleDrivePermission[];
	nextPageToken?: string;
	kind?: string;
}

export function buildGoogleAuthorizationUrl(input: {
	clientId: string;
	redirectUri?: string;
	state: string;
	scopes: readonly string[];
	codeChallenge?: string;
	codeChallengeMethod?: 'S256' | 'plain';
}): string {
	const url = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
	url.searchParams.set('client_id', input.clientId);
	url.searchParams.set('redirect_uri', input.redirectUri ?? GOOGLE_OAUTH_REDIRECT_URI);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', [...new Set(input.scopes)].join(' '));
	url.searchParams.set('state', input.state);
	url.searchParams.set('access_type', 'offline');
	url.searchParams.set('include_granted_scopes', 'true');
	url.searchParams.set('prompt', 'consent');
	if (input.codeChallenge) {
		url.searchParams.set('code_challenge', input.codeChallenge);
		url.searchParams.set('code_challenge_method', input.codeChallengeMethod ?? 'S256');
	}
	return url.toString();
}

export function createGooglePkcePair(): GooglePkcePair {
	const codeVerifier = base64Url(randomBytes(64));
	const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest());
	return { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' };
}

export function scopesForGmailTools(toolNames: readonly string[]): string[] {
	const scopes = new Set<string>([
		...GOOGLE_GMAIL_SCOPES.profile,
		...GOOGLE_GMAIL_SCOPES.read,
	]);
	for (const tool of toolNames) {
		if (tool === 'create_draft') GOOGLE_GMAIL_SCOPES.compose.forEach((scope) => scopes.add(scope));
		if (tool === 'send_email') GOOGLE_GMAIL_SCOPES.send.forEach((scope) => scopes.add(scope));
		if (tool === 'trash_email') GOOGLE_GMAIL_SCOPES.modify.forEach((scope) => scopes.add(scope));
	}
	return [...scopes];
}

export function scopesForGoogleCalendarTools(toolNames: readonly string[]): string[] {
	const scopes = new Set<string>([
		...GOOGLE_CALENDAR_SCOPES.profile,
		...GOOGLE_CALENDAR_SCOPES.read,
	]);
	for (const tool of toolNames) {
		if (['create_event', 'update_event', 'delete_event'].includes(tool)) {
			GOOGLE_CALENDAR_SCOPES.write.forEach((scope) => scopes.add(scope));
		}
	}
	return [...scopes];
}

export function scopesForGoogleDriveTools(toolNames: readonly string[]): string[] {
	const scopes = new Set<string>(GOOGLE_DRIVE_SCOPES.profile);
	if (toolNames.some((tool) => tool !== 'get_profile')) {
		GOOGLE_DRIVE_SCOPES.read.forEach((scope) => scopes.add(scope));
	}
	if (toolNames.includes('create_file')) {
		GOOGLE_DRIVE_SCOPES.write.forEach((scope) => scopes.add(scope));
	}
	return [...scopes];
}

export function scopesForGoogleConnectorTools(
	connectorId: string,
	toolNames: readonly string[]
): string[] {
	if (connectorId === 'connector_googlecalendar') return scopesForGoogleCalendarTools(toolNames);
	if (connectorId === 'connector_googledrive') return scopesForGoogleDriveTools(toolNames);
	return scopesForGmailTools(toolNames);
}

export async function exchangeGoogleAuthorizationCode(input: {
	code: string;
	clientId: string;
	clientSecret?: string;
	redirectUri?: string;
	codeVerifier?: string;
	fetchImpl?: FetchLike;
}): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		code: input.code,
		client_id: input.clientId,
		redirect_uri: input.redirectUri ?? GOOGLE_OAUTH_REDIRECT_URI,
		grant_type: 'authorization_code',
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	if (input.codeVerifier) body.set('code_verifier', input.codeVerifier);
	return requestGoogleToken(body, input.fetchImpl);
}

function base64Url(value: Buffer): string {
	return value
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

export async function refreshGoogleAccessToken(input: {
	clientId: string;
	clientSecret?: string;
	refreshToken: string;
	fetchImpl?: FetchLike;
}): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		client_id: input.clientId,
		refresh_token: input.refreshToken,
		grant_type: 'refresh_token',
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	return requestGoogleToken(body, input.fetchImpl);
}

export class GoogleProfileClient {
	constructor(
		private readonly accessToken: string,
		private readonly fetchImpl: FetchLike = fetch
	) {}

	async getUserInfo(): Promise<GoogleUserInfo> {
		const response = await this.fetchImpl(GOOGLE_USERINFO_URL, {
			headers: { authorization: `Bearer ${this.accessToken}` },
		});
		if (!response.ok) throw await googleHttpError(response, 'Google user info request failed');
		return (await response.json()) as GoogleUserInfo;
	}
}

export class GmailApiClient {
	constructor(
		private readonly accessToken: string,
		private readonly fetchImpl: FetchLike = fetch
	) {}

	async getProfile(): Promise<GmailProfile> {
		return this.fetchJson<GmailProfile>(`${GOOGLE_GMAIL_API_BASE}/profile`);
	}

	async listMessages(input: {
		query?: string;
		maxResults?: number;
		pageToken?: string;
		labelIds?: string[];
		includeSpamTrash?: boolean;
	}): Promise<GmailListResponse> {
		const url = new URL(`${GOOGLE_GMAIL_API_BASE}/messages`);
		url.searchParams.set('maxResults', String(clampMaxResults(input.maxResults)));
		if (input.query) url.searchParams.set('q', input.query);
		if (input.pageToken) url.searchParams.set('pageToken', input.pageToken);
		for (const labelId of input.labelIds ?? []) url.searchParams.append('labelIds', labelId);
		if (input.includeSpamTrash) url.searchParams.set('includeSpamTrash', 'true');
		return this.fetchJson<GmailListResponse>(url.toString());
	}

	async getMessage(
		id: string,
		format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full',
		metadataHeaders: string[] = []
	): Promise<GmailMessage> {
		const url = new URL(`${GOOGLE_GMAIL_API_BASE}/messages/${encodeURIComponent(id)}`);
		url.searchParams.set('format', format);
		for (const header of metadataHeaders) url.searchParams.append('metadataHeaders', header);
		return this.fetchJson<GmailMessage>(url.toString());
	}

	async sendMessage(raw: string): Promise<GmailMessage> {
		return this.fetchJson<GmailMessage>(`${GOOGLE_GMAIL_API_BASE}/messages/send`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ raw }),
		});
	}

	async createDraft(raw: string): Promise<GmailDraftResponse> {
		return this.fetchJson<GmailDraftResponse>(`${GOOGLE_GMAIL_API_BASE}/drafts`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ message: { raw } }),
		});
	}

	async trashMessage(id: string): Promise<GmailMessage> {
		return this.fetchJson<GmailMessage>(
			`${GOOGLE_GMAIL_API_BASE}/messages/${encodeURIComponent(id)}/trash`,
			{ method: 'POST' }
		);
	}

	private async fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
		const response = await this.fetchImpl(url, {
			...init,
			headers: {
				authorization: `Bearer ${this.accessToken}`,
				...(init.headers ?? {}),
			},
		});
		if (!response.ok) throw await googleHttpError(response, 'Gmail API request failed');
		return (await response.json()) as T;
	}
}

export class GoogleCalendarApiClient {
	constructor(
		private readonly accessToken: string,
		private readonly fetchImpl: FetchLike = fetch
	) {}

	async listCalendars(input: {
		maxResults?: number;
		pageToken?: string;
	} = {}): Promise<GoogleCalendarListResponse> {
		const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`);
		url.searchParams.set('maxResults', String(clampMaxResults(input.maxResults, 50)));
		if (input.pageToken) url.searchParams.set('pageToken', input.pageToken);
		return this.fetchJson<GoogleCalendarListResponse>(url.toString());
	}

	async listEvents(input: {
		calendarId?: string;
		query?: string;
		timeMin?: string;
		timeMax?: string;
		maxResults?: number;
		pageToken?: string;
		showDeleted?: boolean;
		singleEvents?: boolean;
		orderBy?: string;
	}): Promise<GoogleCalendarEventsResponse> {
		const calendarId = encodeURIComponent(input.calendarId || 'primary');
		const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`);
		url.searchParams.set('maxResults', String(clampMaxResults(input.maxResults, 20)));
		url.searchParams.set('singleEvents', String(input.singleEvents ?? true));
		url.searchParams.set('orderBy', input.orderBy || 'startTime');
		if (input.query) url.searchParams.set('q', input.query);
		if (input.timeMin) url.searchParams.set('timeMin', input.timeMin);
		if (input.timeMax) url.searchParams.set('timeMax', input.timeMax);
		if (input.pageToken) url.searchParams.set('pageToken', input.pageToken);
		if (input.showDeleted) url.searchParams.set('showDeleted', 'true');
		return this.fetchJson<GoogleCalendarEventsResponse>(url.toString());
	}

	async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
		return this.fetchJson<GoogleCalendarEvent>(
			`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`
		);
	}

	async createEvent(
		calendarId: string,
		event: GoogleCalendarEvent
	): Promise<GoogleCalendarEvent> {
		return this.fetchJson<GoogleCalendarEvent>(
			`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId || 'primary')}/events`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(event),
			}
		);
	}

	async updateEvent(
		calendarId: string,
		eventId: string,
		event: GoogleCalendarEvent
	): Promise<GoogleCalendarEvent> {
		return this.fetchJson<GoogleCalendarEvent>(
			`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`,
			{
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(event),
			}
		);
	}

	async deleteEvent(calendarId: string, eventId: string): Promise<{ deleted: true; calendarId: string; eventId: string }> {
		await this.fetchJson<Record<string, never>>(
			`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`,
			{ method: 'DELETE' }
		);
		return { deleted: true, calendarId: calendarId || 'primary', eventId };
	}

	private async fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
		const response = await this.fetchImpl(url, {
			...init,
			headers: {
				authorization: `Bearer ${this.accessToken}`,
				...(init.headers ?? {}),
			},
		});
		if (!response.ok) throw await googleHttpError(response, 'Google Calendar API request failed');
		if (response.status === 204) return {} as T;
		const text = await response.text();
		return (text ? JSON.parse(text) : {}) as T;
	}
}

export class GoogleDriveApiClient {
	constructor(
		private readonly accessToken: string,
		private readonly fetchImpl: FetchLike = fetch
	) {}

	async listDrives(input: {
		maxResults?: number;
		pageToken?: string;
	} = {}): Promise<GoogleDriveListResponse> {
		const url = new URL(`${GOOGLE_DRIVE_API_BASE}/drives`);
		url.searchParams.set('pageSize', String(clampMaxResults(input.maxResults, 100)));
		url.searchParams.set('fields', 'nextPageToken,drives(id,name,kind)');
		if (input.pageToken) url.searchParams.set('pageToken', input.pageToken);
		return this.fetchJson<GoogleDriveListResponse>(url.toString());
	}

	async searchFiles(input: {
		query?: string;
		driveQuery?: string;
		mimeType?: string;
		maxResults?: number;
		pageToken?: string;
		orderBy?: string;
	} = {}): Promise<GoogleDriveFileListResponse> {
		const url = new URL(`${GOOGLE_DRIVE_API_BASE}/files`);
		url.searchParams.set('pageSize', String(clampMaxResults(input.maxResults, 20)));
		url.searchParams.set('fields', `nextPageToken,files(${GOOGLE_DRIVE_FILE_FIELDS})`);
		url.searchParams.set('supportsAllDrives', 'true');
		url.searchParams.set('includeItemsFromAllDrives', 'true');
		url.searchParams.set('orderBy', input.orderBy || 'modifiedTime desc');
		url.searchParams.set('q', input.driveQuery || buildDriveSearchQuery(input.query, input.mimeType));
		if (input.pageToken) url.searchParams.set('pageToken', input.pageToken);
		return this.fetchJson<GoogleDriveFileListResponse>(url.toString());
	}

	async getFile(fileId: string): Promise<GoogleDriveFile> {
		const url = new URL(`${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`);
		url.searchParams.set('fields', GOOGLE_DRIVE_FILE_FIELDS);
		url.searchParams.set('supportsAllDrives', 'true');
		return this.fetchJson<GoogleDriveFile>(url.toString());
	}

	async getFileContent(file: GoogleDriveFile, exportMimeType?: string): Promise<string> {
		if (!file.id) throw new Error('Google Drive file id is required.');
		const url = isGoogleWorkspaceFile(file.mimeType)
			? new URL(`${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}/export`)
			: new URL(`${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}`);
		if (isGoogleWorkspaceFile(file.mimeType)) {
			url.searchParams.set('mimeType', exportMimeType || defaultDriveExportMimeType(file.mimeType));
		} else {
			url.searchParams.set('alt', 'media');
			url.searchParams.set('supportsAllDrives', 'true');
		}
		const response = await this.fetchImpl(url.toString(), {
			headers: { authorization: `Bearer ${this.accessToken}` },
		});
		if (!response.ok) throw await googleHttpError(response, 'Google Drive API request failed');
		return response.text();
	}

	private async fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
		const response = await this.fetchImpl(url, {
			...init,
			headers: {
				authorization: `Bearer ${this.accessToken}`,
				...(init.headers ?? {}),
			},
		});
		if (!response.ok) throw await googleHttpError(response, 'Google Drive API request failed');
		return (await response.json()) as T;
	}
}

export function projectGmailMessage(message: GmailMessage): Record<string, unknown> {
	const headers = headersToObject(message.payload?.headers ?? []);
	return {
		id: message.id,
		threadId: message.threadId,
		from: headers.from,
		to: headers.to,
		subject: headers.subject,
		date: headers.date,
		snippet: message.snippet,
		labelIds: message.labelIds,
		sizeEstimate: message.sizeEstimate,
	};
}

export function projectGmailMessageWithBody(message: GmailMessage): Record<string, unknown> {
	return {
		...projectGmailMessage(message),
		body: extractTextBody(message.payload).slice(0, 64 * 1024),
	};
}

export function projectGoogleCalendarListEntry(calendar: GoogleCalendarListEntry): Record<string, unknown> {
	return {
		id: calendar.id,
		summary: calendar.summary,
		description: calendar.description,
		timeZone: calendar.timeZone,
		primary: calendar.primary,
		accessRole: calendar.accessRole,
		selected: calendar.selected,
	};
}

export function projectGoogleCalendarEvent(event: GoogleCalendarEvent): Record<string, unknown> {
	return {
		id: event.id,
		status: event.status,
		htmlLink: event.htmlLink,
		summary: event.summary,
		description: event.description,
		location: event.location,
		start: event.start,
		end: event.end,
		creator: event.creator,
		organizer: event.organizer,
		attendees: event.attendees?.map((attendee) => ({
			email: attendee.email,
			displayName: attendee.displayName,
			optional: attendee.optional,
			responseStatus: attendee.responseStatus,
		})),
		recurrence: event.recurrence,
		recurringEventId: event.recurringEventId,
		updated: event.updated,
	};
}

export function projectGoogleDriveFile(file: GoogleDriveFile): Record<string, unknown> {
	return {
		id: file.id,
		name: file.name,
		mimeType: file.mimeType,
		webViewLink: file.webViewLink,
		iconLink: file.iconLink,
		createdTime: file.createdTime,
		modifiedTime: file.modifiedTime,
		size: file.size,
		owners: file.owners?.map((owner) => ({
			displayName: owner.displayName,
			emailAddress: owner.emailAddress,
		})),
		driveId: file.driveId,
		parents: file.parents,
		trashed: file.trashed,
	};
}

export function buildRawEmail(input: {
	to: string[];
	subject: string;
	body: string;
	cc?: string[];
	bcc?: string[];
	isHtml?: boolean;
}): string {
	const headers = [
		`To: ${headerValue(input.to.join(', '))}`,
		...(input.cc?.length ? [`Cc: ${headerValue(input.cc.join(', '))}`] : []),
		...(input.bcc?.length ? [`Bcc: ${headerValue(input.bcc.join(', '))}`] : []),
		`Subject: =?UTF-8?B?${Buffer.from(headerValue(input.subject), 'utf8').toString('base64')}?=`,
		'MIME-Version: 1.0',
		`Content-Type: ${input.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
		'Content-Transfer-Encoding: 8bit',
	];
	return base64UrlEncode(`${headers.join('\r\n')}\r\n\r\n${input.body}`);
}

export function mergeGoogleOAuthCredential(
	current: GoogleOAuthCredential,
	token: GoogleTokenResponse,
	now = Date.now()
): GoogleOAuthCredential {
	return {
		...current,
		accessToken: token.access_token,
		refreshToken: token.refresh_token ?? current.refreshToken,
		expiresAt: token.expires_in ? now + token.expires_in * 1000 : current.expiresAt,
		tokenType: token.token_type ?? current.tokenType,
		scope: token.scope ?? current.scope,
	};
}

async function requestGoogleToken(body: URLSearchParams, fetchImpl: FetchLike = fetch): Promise<GoogleTokenResponse> {
	const response = await fetchImpl(GOOGLE_OAUTH_TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: body.toString(),
	});
	if (!response.ok) throw await googleHttpError(response, 'Google OAuth token request failed');
	const token = (await response.json()) as Partial<GoogleTokenResponse>;
	if (!token.access_token) throw new Error('Google OAuth response did not include an access token.');
	return token as GoogleTokenResponse;
}

async function googleHttpError(response: Response, fallback: string): Promise<Error> {
	let message = fallback;
	try {
		const body = (await response.json()) as { error?: { message?: string } | string; error_description?: string };
		if (typeof body.error === 'string') message = body.error_description ?? body.error;
		else if (body.error?.message) message = body.error.message;
	} catch {
		try {
			const text = await response.text();
			if (text.trim()) message = text.slice(0, 500);
		} catch {
			// Keep fallback.
		}
	}
	return new Error(`${message} (${response.status})`);
}

const GOOGLE_DRIVE_FILE_FIELDS = [
	'id',
	'name',
	'mimeType',
	'webViewLink',
	'iconLink',
	'createdTime',
	'modifiedTime',
	'size',
	'owners(displayName,emailAddress)',
	'driveId',
	'parents',
	'trashed',
].join(',');

function buildDriveSearchQuery(query: string | undefined, mimeType: string | undefined): string {
	const clauses = ['trashed = false'];
	if (query) {
		const escaped = escapeDriveQueryValue(query);
		clauses.push(`(name contains '${escaped}' or fullText contains '${escaped}')`);
	}
	if (mimeType) clauses.push(`mimeType = '${escapeDriveQueryValue(mimeType)}'`);
	return clauses.join(' and ');
}

function escapeDriveQueryValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isGoogleWorkspaceFile(mimeType: string | undefined): boolean {
	return Boolean(mimeType?.startsWith('application/vnd.google-apps.'));
}

function defaultDriveExportMimeType(mimeType: string | undefined): string {
	if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'text/csv';
	return 'text/plain';
}

function headersToObject(headers: GmailMessageHeader[]): Record<string, string> {
	const output: Record<string, string> = {};
	for (const header of headers) {
		const name = header.name?.toLowerCase();
		if (name && header.value) output[name] = header.value;
	}
	return output;
}

function extractTextBody(part: GmailMessagePart | undefined): string {
	if (!part) return '';
	if (part.body?.data && isTextMimeType(part.mimeType)) return decodeBase64Url(part.body.data);
	const childText = (part.parts ?? []).map(extractTextBody).filter(Boolean);
	const plain = childText.find((_text, index) => part.parts?.[index]?.mimeType === 'text/plain');
	return plain ?? childText.join('\n\n');
}

function isTextMimeType(mimeType: string | undefined): boolean {
	return mimeType === 'text/plain' || mimeType === 'text/html';
}

function decodeBase64Url(value: string): string {
	return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function base64UrlEncode(value: string): string {
	return Buffer.from(value, 'utf8')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function headerValue(value: string): string {
	if (/[\r\n]/.test(value)) throw new Error('Email header values cannot contain line breaks.');
	return value.trim();
}

function clampMaxResults(value: number | undefined, max = 20): number {
	if (!value || !Number.isFinite(value)) return Math.min(10, max);
	return Math.max(1, Math.min(max, Math.floor(value)));
}
