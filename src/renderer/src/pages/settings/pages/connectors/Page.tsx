import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Plug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ConnectorCatalogEntry } from '../../../../../../shared/connector';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { ConnectorCatalogItem } from './components/ConnectorCatalogItem';
import { ConnectorIcon } from './components/ConnectorIcon';
import { useConnectors } from './hooks/useConnectors';

type GoogleWorkspaceConnectorCard = Pick<
	ConnectorCatalogEntry,
	'id' | 'name' | 'description' | 'directConnectorId' | 'tools'
>;

const ConnectorsPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [oauthError, setOauthError] = useState<string | null>(null);
	const [oauthMessage, setOauthMessage] = useState<string | null>(null);
	const [oauthBusyId, setOauthBusyId] = useState<string | null>(null);
	const {
		catalog, connectors, busyId,
		error,
		statusMessage,
		toggleConnector,
	} = useConnectors();
	const oauthCatalog: GoogleWorkspaceConnectorCard[] = [
		{
			id: 'google.gmail',
			name: 'Gmail',
			description: 'Authorize the official Gmail MCP server for mail search, drafts, labels, and threads.',
			directConnectorId: 'gmail',
			tools: [
				'create_draft',
				'list_drafts',
				'get_thread',
				'search_threads',
				'label_thread',
				'unlabel_thread',
				'list_labels',
				'label_message',
				'unlabel_message',
				'create_label',
			],
		},
		{
			id: 'google.calendar',
			name: 'Google Calendar',
			description: 'Authorize the official Calendar MCP server for calendars, events, scheduling, and RSVPs.',
			directConnectorId: 'google_calendar',
			tools: [
				'list_events',
				'get_event',
				'list_calendars',
				'suggest_time',
				'create_event',
				'update_event',
				'delete_event',
				'respond_to_event',
			],
		},
		{
			id: 'google.drive',
			name: 'Google Drive',
			description: 'Authorize Drive access for file search, metadata, content reads, and file creation.',
			directConnectorId: 'google_drive',
			tools: ['Search files', 'Read content', 'Inspect metadata', 'Create files'],
		},
	];
	const mcpCatalog = catalog.filter((connector) => connector.authKind !== 'oauth');
	const oauthConfiguredConnectorIds = new Set(
		connectors.filter((connector) => connector.authKind === 'oauth').map((connector) => connector.connectorId)
	);
	const mcpConnectors = connectors.filter((connector) => connector.authKind !== 'oauth');
	const mcpConfiguredConnectorIds = new Set(mcpConnectors.map((connector) => connector.connectorId));

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const configureCatalogConnector = (id: string): void => {
		navigate(`/settings/connectors/configure/${encodeURIComponent(id)}`);
	};

	const authorizeOAuthConnector = async (connector: GoogleWorkspaceConnectorCard): Promise<void> => {
		setOauthError(null);
		setOauthMessage(null);
		setOauthBusyId(connector.id);
		try {
			await window.connectors.authorizeOAuth(connector.id);
			setOauthMessage(`${connector.name} OAuth request opened.`);
		} catch (err) {
			setOauthError(err instanceof Error ? err.message : String(err));
		} finally {
			setOauthBusyId(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.connectors')}
				description={t('settings.connectors.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{oauthError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{oauthError}
				</SettingsNotice>
			)}
			{statusMessage && <SettingsNotice variant="default">{statusMessage}</SettingsNotice>}
			{oauthMessage && <SettingsNotice variant="default">{oauthMessage}</SettingsNotice>}

			<SettingsSection
				title="Google Workspace"
				description="Authorize Google services through OAuth."
			>
				<div className="grid gap-2">
					{oauthCatalog.map((connector) => (
						<SettingsPanel key={connector.id} className="overflow-hidden">
							<div className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div className="flex min-w-0 items-start gap-2.5">
									<ConnectorIcon
										directConnectorId={connector.directConnectorId}
										name={connector.name}
										className="mt-0.5 size-8"
									/>
									<div className="min-w-0">
										<div className="flex min-w-0 flex-wrap items-center gap-1.5">
											<h2 className="min-w-0 truncate text-[13px] font-semibold leading-4 text-foreground">
												{connector.name}
											</h2>
											<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
												Google OAuth
											</Badge>
										</div>
										<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground/70">
											{connector.description}
										</p>
										<div className="mt-1.5 flex flex-wrap gap-1">
											{connector.tools.map((capability) => (
												<span
													key={capability}
													className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
												>
													{capability}
												</span>
											))}
										</div>
									</div>
								</div>
								<Button
									type="button"
									size="sm"
									disabled={oauthBusyId === connector.id}
									className="w-full sm:w-auto"
									aria-label={`Authorize ${connector.name} with Google OAuth`}
									onClick={() => void authorizeOAuthConnector(connector)}
								>
									<ExternalLink className="size-3.5" />
									{oauthConfiguredConnectorIds.has(connector.id) ? 'Reconnect' : 'Authorize'}
								</Button>
							</div>
						</SettingsPanel>
					))}
				</div>
			</SettingsSection>

			<SettingsSection title="MCP connectors">
				<div className="grid gap-2">
					{mcpConnectors.length === 0 ? (
						<SettingsPanel>
							<SettingsEmptyState
								icon={Plug}
								title="No connectors configured yet."
								description="Add a connector to make external tools available to agent runs."
							/>
						</SettingsPanel>
					) : (
						mcpConnectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								busy={busyId === connector.id}
								onToggle={() => void toggleConnector(connector)}
								onViewDetails={() => openConnectorDetails(connector.id)}
							/>
						))
					)}
					{mcpCatalog.map((item) => (
						<ConnectorCatalogItem
							key={item.id}
							item={item}
							onConfigure={() => configureCatalogConnector(item.id)}
							alreadyConfigured={mcpConfiguredConnectorIds.has(item.id)}
						/>
					))}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
