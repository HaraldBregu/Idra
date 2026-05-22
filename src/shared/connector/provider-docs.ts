import type { OpenAiConnectorId } from '../connectors';
import type { ProviderConnectorDocsMetadata } from './models';

export const PROVIDER_CONNECTOR_DOCS = {
	connector_dropbox: {
		providerId: 'dropbox',
		providerName: 'Dropbox',
		providerDocsPath: 'docs/providers/dropbox/drive/index.md',
		providerDocsLabel: 'Dropbox Drive connector guide',
		runtimeStatus: 'settings_catalog_only',
	},
	connector_gmail: {
		providerId: 'google',
		providerName: 'Google DeepMind / Google',
		providerDocsPath: 'docs/providers/google/gmail/index.md',
		providerDocsLabel: 'Gmail connector guide',
		runtimeStatus: 'local_oauth_and_local_tool_execution',
	},
	connector_googlecalendar: {
		providerId: 'google',
		providerName: 'Google DeepMind / Google',
		providerDocsPath: 'docs/providers/google/calendar/index.md',
		providerDocsLabel: 'Google Calendar connector guide',
		runtimeStatus: 'local_oauth_and_local_tool_execution',
	},
	connector_googledrive: {
		providerId: 'google',
		providerName: 'Google DeepMind / Google',
		providerDocsPath: 'docs/providers/google/drive/index.md',
		providerDocsLabel: 'Google Drive connector guide',
		runtimeStatus: 'local_oauth_and_local_tool_execution',
	},
	connector_microsoftteams: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/teams/index.md',
		providerDocsLabel: 'Microsoft Teams connector guide',
		runtimeStatus: 'settings_catalog_only',
	},
	connector_outlookcalendar: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/outlook-calendar/index.md',
		providerDocsLabel: 'Outlook Calendar connector guide',
		runtimeStatus: 'settings_catalog_only',
	},
	connector_outlookemail: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/outlook-email/index.md',
		providerDocsLabel: 'Outlook Email connector guide',
		runtimeStatus: 'settings_catalog_only',
	},
	connector_sharepoint: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/sharepoint/index.md',
		providerDocsLabel: 'SharePoint connector guide',
		runtimeStatus: 'settings_catalog_only',
	},
} as const satisfies Record<OpenAiConnectorId, ProviderConnectorDocsMetadata>;
