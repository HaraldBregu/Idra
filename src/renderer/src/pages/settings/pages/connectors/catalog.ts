import type { DirectConnectorCatalogId } from '../../../../../../shared/connector';

export type SettingsConnectorCatalogEntry = {
	readonly connectorId: string;
	readonly directConnectorId: DirectConnectorCatalogId;
	readonly name: string;
	readonly description: string;
};

export const SETTINGS_CONNECTOR_CATALOG: readonly SettingsConnectorCatalogEntry[] = [
	{
		connectorId: 'google.gmail',
		directConnectorId: 'gmail',
		name: 'Gmail',
		description: 'Read, search, draft, and send Gmail messages.',
	},
	{
		connectorId: 'google.calendar',
		directConnectorId: 'google_calendar',
		name: 'Google Calendar',
		description: 'Find events and manage calendar schedules.',
	},
	{
		connectorId: 'google.drive',
		directConnectorId: 'google_drive',
		name: 'Google Drive',
		description: 'Search and work with Drive files and folders.',
	},
	{
		connectorId: 'dropbox.files',
		directConnectorId: 'dropbox',
		name: 'Dropbox',
		description: 'Browse and manage Dropbox files.',
	},
	{
		connectorId: 'connector_microsoftteams',
		directConnectorId: 'microsoft_teams',
		name: 'Microsoft Teams',
		description: 'Work with Teams, channels, and messages.',
	},
	{
		connectorId: 'connector_outlookcalendar',
		directConnectorId: 'outlook',
		name: 'Outlook Calendar',
		description: 'Read and manage Outlook calendar events.',
	},
	{
		connectorId: 'connector_outlookemail',
		directConnectorId: 'outlook',
		name: 'Outlook Email',
		description: 'Read, search, draft, and send Outlook mail.',
	},
	{
		connectorId: 'connector_sharepoint',
		directConnectorId: 'sharepoint_onedrive',
		name: 'SharePoint',
		description: 'Search sites, libraries, and shared documents.',
	},
];
