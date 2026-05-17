import type { GoogleOAuthCredential } from '../../shared/connectors';

export const GOOGLE_OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const GOOGLE_OAUTH_REDIRECT_URI = 'http://127.0.0.1:42818/oauth/google/callback';

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

export type FetchLike = typeof fetch;

export interface GoogleTokenResponse {
	access_token: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
	token_type?: string;
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

export function buildGoogleAuthorizationUrl(input: {
	clientId: string;
	redirectUri?: string;
	state: string;
	scopes: readonly string[];
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
	return url.toString();
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

export async function exchangeGoogleAuthorizationCode(input: {
	code: string;
	clientId: string;
	clientSecret?: string;
	redirectUri?: string;
	fetchImpl?: FetchLike;
}): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		code: input.code,
		client_id: input.clientId,
		redirect_uri: input.redirectUri ?? GOOGLE_OAUTH_REDIRECT_URI,
		grant_type: 'authorization_code',
	});
	if (input.clientSecret) body.set('client_secret', input.clientSecret);
	return requestGoogleToken(body, input.fetchImpl);
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
	const plain = childText.find((text, index) => part.parts?.[index]?.mimeType === 'text/plain');
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

function clampMaxResults(value: number | undefined): number {
	if (!value || !Number.isFinite(value)) return 10;
	return Math.max(1, Math.min(20, Math.floor(value)));
}
