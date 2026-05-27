export const PROVIDER_CONNECTOR_RUNTIME_STATUSES = [
	'mcp_dynamic_tools',
	'settings_catalog_only',
] as const;

export type ProviderConnectorRuntimeStatus =
	(typeof PROVIDER_CONNECTOR_RUNTIME_STATUSES)[number];

export interface ProviderConnectorDocsMetadata {
	readonly providerId: string;
	readonly providerName: string;
	readonly providerDocsPath: string;
	readonly providerDocsLabel: string;
	readonly runtimeStatus: ProviderConnectorRuntimeStatus;
}

export const PROVIDER_CONNECTOR_DOCS = {
	connector_dropbox: {
		providerId: 'dropbox',
		providerName: 'Dropbox',
		providerDocsPath: 'docs/providers/dropbox/drive/index.md',
		providerDocsLabel: 'Dropbox Drive connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_gmail: {
		providerId: 'google',
		providerName: 'Google DeepMind / Google',
		providerDocsPath: 'docs/providers/google/gmail/index.md',
		providerDocsLabel: 'Gmail connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_googlecalendar: {
		providerId: 'google',
		providerName: 'Google DeepMind / Google',
		providerDocsPath: 'docs/providers/google/calendar/index.md',
		providerDocsLabel: 'Google Calendar connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_googledrive: {
		providerId: 'google',
		providerName: 'Google DeepMind / Google',
		providerDocsPath: 'docs/providers/google/drive/index.md',
		providerDocsLabel: 'Google Drive connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_microsoftteams: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/teams/index.md',
		providerDocsLabel: 'Microsoft Teams connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_outlookcalendar: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/outlook-calendar/index.md',
		providerDocsLabel: 'Outlook Calendar connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_outlookemail: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/outlook-email/index.md',
		providerDocsLabel: 'Outlook Email connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_remote_mcp: {
		providerId: 'mcp',
		providerName: 'Model Context Protocol',
		providerDocsPath: 'docs/providers/mcp/remote/index.md',
		providerDocsLabel: 'Remote MCP connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_stdio_mcp: {
		providerId: 'mcp',
		providerName: 'Model Context Protocol',
		providerDocsPath: 'docs/providers/mcp/stdio/index.md',
		providerDocsLabel: 'Local MCP connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
	connector_sharepoint: {
		providerId: 'microsoft',
		providerName: 'Microsoft',
		providerDocsPath: 'docs/providers/microsoft/sharepoint/index.md',
		providerDocsLabel: 'SharePoint connector guide',
		runtimeStatus: 'mcp_dynamic_tools',
	},
} as const satisfies Record<string, ProviderConnectorDocsMetadata>;

export type ProviderConnectorDocsId = keyof typeof PROVIDER_CONNECTOR_DOCS;
