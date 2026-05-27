import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { ConnectorCatalogEntry, ConnectorView } from '../../../../../../shared/connector';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { ConnectorCatalogItem } from './components/ConnectorCatalogItem';
import { ConnectorIcon } from './components/ConnectorIcon';
import { useConnectors } from './hooks/useConnectors';

type HardcodedOAuthConnector = Pick<
	ConnectorCatalogEntry,
	'id' | 'name' | 'description' | 'directConnectorId'
>;

const GOOGLE_WORKSPACE_CONNECTORS: readonly HardcodedOAuthConnector[] = [
	{
		id: 'google.gmail',
		name: 'Gmail',
		description: 'Gmail MCP connector',
		directConnectorId: 'gmail',
	},
	{
		id: 'google.calendar',
		name: 'Google Calendar',
		description: 'Google Calendar MCP connector',
		directConnectorId: 'google_calendar',
	},
	{
		id: 'google.drive',
		name: 'Google Drive',
		description: 'Google Drive MCP connector',
		directConnectorId: 'google_drive',
	},
];

const ConnectorsPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [oauthError, setOauthError] = useState<string | null>(null);
	const toolRefreshAttempts = useRef(new Set<string>());
	const {
		catalog, connectors,
		error,
		statusMessage,
		load,
	} = useConnectors();
	const mcpCatalog = catalog.filter((connector) => connector.authKind !== 'oauth' && !connector.oauth);
	const mcpConnectors = connectors.filter((connector) => connector.authKind !== 'oauth');
	const connectorByProviderId = useMemo(
		() => new Map(connectors.map((connector) => [connector.connectorId, connector])),
		[connectors]
	);

	useEffect(() => {
		const missingToolConnectors = GOOGLE_WORKSPACE_CONNECTORS
			.map((connector) => connectorByProviderId.get(connector.id))
			.filter((connector): connector is ConnectorView =>
				Boolean(connector && !connector.hasTools && !toolRefreshAttempts.current.has(connector.id))
			);
		if (missingToolConnectors.length === 0) return;

		let cancelled = false;
		for (const connector of missingToolConnectors) toolRefreshAttempts.current.add(connector.id);
		void Promise.all(missingToolConnectors.map((connector) => window.connectors.refreshTools(connector.id)))
			.then(() => {
				if (!cancelled) void load();
			})
			.catch((err) => {
				if (!cancelled) setOauthError(err instanceof Error ? err.message : String(err));
			});

		return () => {
			cancelled = true;
		};
	}, [connectorByProviderId, load]);

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const configureCatalogConnector = (id: string): void => {
		navigate(`/settings/connectors/configure/${encodeURIComponent(id)}`);
	};

	const authorizeOAuthConnector = async (connector: HardcodedOAuthConnector): Promise<void> => {
		setOauthError(null);
		try {
			await window.connectors.authorizeOAuth(connector.id);
			await load();
		} catch (err) {
			setOauthError(err instanceof Error ? err.message : String(err));
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

			<SettingsSection
				title="OAuth connectors"
				description="Authorize services through OAuth."
			>
				<div className="grid gap-2">
					{GOOGLE_WORKSPACE_CONNECTORS.map((connector) => {
						const state = connectorByProviderId.get(connector.id);
						const tokenLabel = state?.hasToken ? 'Token saved' : 'Token missing';
						const toolsLabel = state?.hasTools ? `${state.toolsCount} tools` : 'No tools';
						return (
						<Item
							key={connector.id}
							variant="outline"
							size="md"
							onClick={() => void authorizeOAuthConnector(connector)}
							className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
						>
							<ConnectorIcon
								directConnectorId={connector.directConnectorId}
								name={connector.name}
							/>
							<ItemContent className="min-w-0 flex-col items-start gap-1">
								<ItemTitle className="min-w-0 truncate">{connector.name}</ItemTitle>
								<p className="text-[11px] leading-4 text-muted-foreground/60">
									{connector.description}
								</p>
							</ItemContent>
							<ItemActions className="ml-auto flex-none flex-wrap justify-end gap-1.5">
								<Badge variant={state?.hasToken ? 'secondary' : 'outline'} className="h-5 px-1.5 text-[10px]">
									{tokenLabel}
								</Badge>
								<Badge variant={state?.hasTools ? 'secondary' : 'outline'} className="h-5 px-1.5 text-[10px]">
									{toolsLabel}
								</Badge>
								<ChevronRight className="size-3.5 text-muted-foreground" />
							</ItemActions>
						</Item>
						);
					})}
				</div>
			</SettingsSection>

			{(mcpConnectors.length > 0 || mcpCatalog.length > 0) && (
				<SettingsSection title="MCP connectors">
					<div className="grid gap-2">
						{mcpConnectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								onViewDetails={() => openConnectorDetails(connector.id)}
							/>
						))}
						{mcpCatalog.map((item) => (
							<ConnectorCatalogItem
								key={item.id}
								item={item}
								onConfigure={() => configureCatalogConnector(item.id)}
							/>
						))}
					</div>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
