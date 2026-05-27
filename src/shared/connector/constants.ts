import type { DirectConnectorCatalogId } from './types';

export type StaticConnectorAuthKind = 'oauth';

export interface StaticOAuthConnectorDefinition {
	readonly id: string;
	readonly providerId: string;
	readonly directConnectorId: DirectConnectorCatalogId;
	readonly name: string;
	readonly description: string;
	readonly authKind: StaticConnectorAuthKind;
	readonly docsPath: string;
	readonly setupUrl: string;
	readonly capabilities: readonly string[];
	readonly oauth: {
		readonly authorizationUrl: string;
		readonly clientIdEnvVar: string;
		readonly redirectUri: string;
		readonly responseType: 'code';
		readonly accessType: 'offline';
		readonly prompt: 'consent';
		readonly scopes: readonly string[];
	};
}

export const GOOGLE_OAUTH_PROVIDER_ID = 'google' as const;
export const GOOGLE_OAUTH_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth' as const;
export const GOOGLE_OAUTH_CLIENT_ID_ENV = 'GOOGLE_OAUTH_CLIENT_ID' as const;
export const GOOGLE_OAUTH_CLIENT_SECRET_ENV = 'GOOGLE_OAUTH_CLIENT_SECRET' as const;
export const GOOGLE_OAUTH_REDIRECT_URI = 'http://127.0.0.1' as const;
export const GOOGLE_OAUTH_SETUP_URL = 'https://console.cloud.google.com/apis/credentials' as const;

export const GOOGLE_WORKSPACE_OAUTH_CONNECTORS = [
	{
		id: 'google.gmail',
		providerId: GOOGLE_OAUTH_PROVIDER_ID,
		directConnectorId: 'gmail',
		name: 'Gmail',
		description: 'Authorize Gmail access for mail search, drafts, sending, and mailbox updates.',
		authKind: 'oauth',
		docsPath: 'docs/connectors/gmail.md',
		setupUrl: GOOGLE_OAUTH_SETUP_URL,
		capabilities: ['Search mail', 'Read messages', 'Create drafts', 'Send mail'],
		oauth: {
			authorizationUrl: GOOGLE_OAUTH_AUTHORIZATION_URL,
			clientIdEnvVar: GOOGLE_OAUTH_CLIENT_ID_ENV,
			redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
			responseType: 'code',
			accessType: 'offline',
			prompt: 'consent',
			scopes: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
				'https://www.googleapis.com/auth/gmail.readonly',
				'https://www.googleapis.com/auth/gmail.compose',
				'https://www.googleapis.com/auth/gmail.send',
				'https://www.googleapis.com/auth/gmail.modify',
			],
		},
	},
	{
		id: 'google.calendar',
		providerId: GOOGLE_OAUTH_PROVIDER_ID,
		directConnectorId: 'google_calendar',
		name: 'Google Calendar',
		description: 'Authorize Calendar access for calendar lists, event search, and event changes.',
		authKind: 'oauth',
		docsPath: 'docs/connectors/google-calendar.md',
		setupUrl: GOOGLE_OAUTH_SETUP_URL,
		capabilities: ['List calendars', 'Search events', 'Read events', 'Manage events'],
		oauth: {
			authorizationUrl: GOOGLE_OAUTH_AUTHORIZATION_URL,
			clientIdEnvVar: GOOGLE_OAUTH_CLIENT_ID_ENV,
			redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
			responseType: 'code',
			accessType: 'offline',
			prompt: 'consent',
			scopes: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
				'https://www.googleapis.com/auth/calendar.readonly',
				'https://www.googleapis.com/auth/calendar.events.readonly',
				'https://www.googleapis.com/auth/calendar.events',
			],
		},
	},
	{
		id: 'google.drive',
		providerId: GOOGLE_OAUTH_PROVIDER_ID,
		directConnectorId: 'google_drive',
		name: 'Google Drive',
		description: 'Authorize Drive access for file search, metadata, content reads, and file creation.',
		authKind: 'oauth',
		docsPath: 'docs/connectors/google-drive.md',
		setupUrl: GOOGLE_OAUTH_SETUP_URL,
		capabilities: ['Search files', 'Read content', 'Inspect metadata', 'Create files'],
		oauth: {
			authorizationUrl: GOOGLE_OAUTH_AUTHORIZATION_URL,
			clientIdEnvVar: GOOGLE_OAUTH_CLIENT_ID_ENV,
			redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
			responseType: 'code',
			accessType: 'offline',
			prompt: 'consent',
			scopes: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
				'https://www.googleapis.com/auth/drive.readonly',
				'https://www.googleapis.com/auth/drive.file',
			],
		},
	},
] as const satisfies readonly StaticOAuthConnectorDefinition[];
