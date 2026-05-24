import type {
	ConnectorConfig,
	ConnectorTool,
	OpenAiConnectorId,
} from '../../shared/connector';
import {
	GoogleCalendarApiClient,
	GoogleDriveApiClient,
	GoogleProfileClient,
	GmailApiClient,
	buildRawEmail,
	projectGoogleCalendarEvent,
	projectGoogleCalendarListEntry,
	projectGoogleDriveFile,
	projectGoogleDrivePermission,
	projectGmailMessage,
	projectGmailMessageWithBody,
	type FetchLike,
	type GoogleCalendarEvent,
} from './google';
import type { ConnectorRuntimeStrategy, ConnectorToolLister } from './runtime';

export interface GoogleRuntimeDependencies {
	getAccessToken: (connector: ConnectorConfig) => Promise<string>;
	fetchImpl: () => FetchLike;
	listTools: ConnectorToolLister;
}

abstract class GoogleConnectorRuntimeStrategy implements ConnectorRuntimeStrategy {
	constructor(
		readonly connectorId: OpenAiConnectorId,
		protected readonly dependencies: GoogleRuntimeDependencies
	) {}

	abstract callTool(connector: ConnectorConfig, name: string, args: unknown): Promise<unknown>;

	listTools(connector: ConnectorConfig): ConnectorTool[] {
		return this.dependencies.listTools(connector);
	}

	protected getAccessToken(connector: ConnectorConfig): Promise<string> {
		return this.dependencies.getAccessToken(connector);
	}

	protected fetchImpl(): FetchLike {
		return this.dependencies.fetchImpl();
	}
}

export class GmailRuntimeStrategy extends GoogleConnectorRuntimeStrategy {
	constructor(dependencies: GoogleRuntimeDependencies) {
		super('connector_gmail', dependencies);
	}

	async callTool(
		connector: ConnectorConfig,
		name: string,
		args: unknown
	): Promise<unknown> {
		const params = paramsRecord(args);
		const client = async (): Promise<GmailApiClient> =>
			new GmailApiClient(await this.getAccessToken(connector), this.fetchImpl());
		switch (name) {
			case 'get_profile':
				return (await client()).getProfile();
			case 'search_email_ids': {
				const input = {
					query: readString(params, 'query'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					labelIds: readStringList(params, 'labelIds'),
					includeSpamTrash: readBoolean(params, 'includeSpamTrash'),
				};
				const listed = await (await client()).listMessages(input);
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
				const input = {
					query: name === 'search_emails' ? readString(params, 'query') : undefined,
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					labelIds: readStringList(params, 'labelIds'),
					includeSpamTrash: readBoolean(params, 'includeSpamTrash'),
				};
				const gmail = await client();
				const listed = await gmail.listMessages(input);
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
				return projectGmailMessageWithBody(await (await client()).getMessage(id, 'full'));
			}
			case 'batch_read_email': {
				const ids = readStringList(params, 'ids') ?? [];
				if (ids.length === 0) throw new Error('ids must include at least one message id.');
				const gmail = await client();
				return {
					messages: await Promise.all(
						ids.slice(0, 10).map((id) => gmail.getMessage(id, 'full').then(projectGmailMessageWithBody))
					),
				};
			}
			case 'create_draft': {
				const email = readEmailDraftParams(params);
				return (await client()).createDraft(buildRawEmail(email));
			}
			case 'send_email': {
				const email = readEmailDraftParams(params);
				return (await client()).sendMessage(buildRawEmail(email));
			}
			case 'trash_email':
				return (await client()).trashMessage(readRequiredMessageId(params));
			default:
				throw new Error(`Unsupported Gmail tool: ${name}`);
		}
	}
}

export class GoogleCalendarRuntimeStrategy extends GoogleConnectorRuntimeStrategy {
	constructor(dependencies: GoogleRuntimeDependencies) {
		super('connector_googlecalendar', dependencies);
	}

	async callTool(
		connector: ConnectorConfig,
		name: string,
		args: unknown
	): Promise<unknown> {
		const params = paramsRecord(args);
		const accessToken = async (): Promise<string> => this.getAccessToken(connector);
		const client = async (): Promise<GoogleCalendarApiClient> =>
			new GoogleCalendarApiClient(await accessToken(), this.fetchImpl());
		switch (name) {
			case 'get_profile':
				return new GoogleProfileClient(await accessToken(), this.fetchImpl()).getUserInfo();
			case 'list_calendars': {
				const input = {
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
				};
				const listed = await (await client()).listCalendars(input);
				return {
					...listed,
					items: (listed.items ?? []).map(projectGoogleCalendarListEntry),
				};
			}
			case 'search':
			case 'search_events': {
				const input = {
					calendarId: readCalendarId(params),
					query: readString(params, 'query'),
					timeMin: readString(params, 'timeMin'),
					timeMax: readString(params, 'timeMax'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					showDeleted: readBoolean(params, 'showDeleted'),
					singleEvents: readBoolean(params, 'singleEvents'),
					orderBy: readString(params, 'orderBy'),
				};
				const listed = await (await client()).listEvents(input);
				return {
					...listed,
					items: (listed.items ?? []).map(projectGoogleCalendarEvent),
				};
			}
			case 'fetch':
			case 'read_event': {
				const { calendarId, eventId } = readEventLookupParams(params);
				return projectGoogleCalendarEvent(await (await client()).getEvent(calendarId, eventId));
			}
			case 'create_event': {
				const calendarId = readCalendarId(params);
				const payload = readCalendarEventPayload(params, true);
				return projectGoogleCalendarEvent(await (await client()).createEvent(calendarId, payload));
			}
			case 'update_event': {
				const { calendarId, eventId } = readEventLookupParams(params);
				const payload = readCalendarEventPayload(params, false);
				return projectGoogleCalendarEvent(await (await client()).updateEvent(calendarId, eventId, payload));
			}
			case 'delete_event': {
				const { calendarId, eventId } = readEventLookupParams(params);
				return (await client()).deleteEvent(calendarId, eventId);
			}
			default:
				throw new Error(`Unsupported Google Calendar tool: ${name}`);
		}
	}
}

export class GoogleDriveRuntimeStrategy extends GoogleConnectorRuntimeStrategy {
	constructor(dependencies: GoogleRuntimeDependencies) {
		super('connector_googledrive', dependencies);
	}

	async callTool(
		connector: ConnectorConfig,
		name: string,
		args: unknown
	): Promise<unknown> {
		const params = paramsRecord(args);
		const accessToken = async (): Promise<string> => this.getAccessToken(connector);
		const client = async (): Promise<GoogleDriveApiClient> =>
			new GoogleDriveApiClient(await accessToken(), this.fetchImpl());
		switch (name) {
			case 'get_profile':
				return new GoogleProfileClient(await accessToken(), this.fetchImpl()).getUserInfo();
			case 'list_drives': {
				const input = {
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
				};
				return (await client()).listDrives(input);
			}
			case 'search_files':
			case 'search': {
				const input = {
					query: readString(params, 'query') ?? readString(params, 'q'),
					driveQuery: readString(params, 'driveQuery'),
					mimeType: readString(params, 'mimeType'),
					driveId: readString(params, 'driveId'),
					corpora: readString(params, 'corpora'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					orderBy: readString(params, 'orderBy'),
				};
				const listed = await (await client()).searchFiles(input);
				return {
					...listed,
					files: (listed.files ?? []).map(projectGoogleDriveFile),
				};
			}
			case 'list_recent_files':
			case 'recent_documents': {
				const input = {
					mimeType: readString(params, 'mimeType'),
					driveId: readString(params, 'driveId'),
					corpora: readString(params, 'corpora'),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
					orderBy: 'modifiedTime desc',
				};
				const listed = await (await client()).searchFiles(input);
				return {
					...listed,
					files: (listed.files ?? []).map(projectGoogleDriveFile),
				};
			}
			case 'get_file_metadata':
				return projectGoogleDriveFile(await (await client()).getFile(readDriveFileId(params)));
			case 'get_file_permissions': {
				const input = {
					fileId: readDriveFileId(params),
					maxResults: readNumber(params, 'maxResults'),
					pageToken: readString(params, 'pageToken'),
				};
				const listed = await (await client()).listPermissions(input);
				return {
					...listed,
					permissions: (listed.permissions ?? []).map(projectGoogleDrivePermission),
				};
			}
			case 'read_file_content':
			case 'download_file_content':
			case 'fetch': {
				const fileId = readDriveFileId(params);
				const exportMimeType = readString(params, 'exportMimeType') ?? readString(params, 'mimeType');
				const drive = await client();
				const file = await drive.getFile(fileId);
				const content = await drive.getFileContent(file, exportMimeType);
				return {
					...projectGoogleDriveFile(file),
					content: content.slice(0, 64 * 1024),
				};
			}
			case 'create_file': {
				const input = readDriveCreateFileParams(params);
				return projectGoogleDriveFile(await (await client()).createFile(input));
			}
			default:
				throw new Error(`Unsupported Google Drive tool: ${name}`);
		}
	}
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
