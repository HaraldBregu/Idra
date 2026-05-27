import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { ConnectorCatalogEntry } from '../../../../../../shared/connector';
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

const ConnectorsPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [oauthError, setOauthError] = useState<string | null>(null);
	const {
		catalog, connectors,
		error,
		statusMessage,
	} = useConnectors();
	const oauthCatalog = catalog.filter((connector) => connector.authKind === 'oauth' || connector.oauth);
	const mcpCatalog = catalog.filter((connector) => connector.authKind !== 'oauth' && !connector.oauth);
	const mcpConnectors = connectors.filter((connector) => connector.authKind !== 'oauth');

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const configureCatalogConnector = (id: string): void => {
		navigate(`/settings/connectors/configure/${encodeURIComponent(id)}`);
	};

	const authorizeOAuthConnector = async (connector: ConnectorCatalogEntry): Promise<void> => {
		setOauthError(null);
		try {
			await window.connectors.authorizeOAuth(connector.id);
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
					{oauthCatalog.map((connector) => (
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
							<ItemContent className="min-w-0">
								<ItemTitle className="min-w-0 truncate">{connector.name}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ChevronRight className="size-3.5 text-muted-foreground" />
							</ItemActions>
						</Item>
					))}
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
