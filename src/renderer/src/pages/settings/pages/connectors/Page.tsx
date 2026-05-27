import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Plug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { openExternalUrl } from '@/lib/external-links';
import { GOOGLE_WORKSPACE_OAUTH_CONNECTORS } from '../../../../../../shared/connector';
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

const ConnectorsPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [oauthError, setOauthError] = useState<string | null>(null);
	const [oauthMessage, setOauthMessage] = useState<string | null>(null);
	const {
		catalog, connectors, busyId,
		error,
		statusMessage,
		toggleConnector,
	} = useConnectors();
	const configuredConnectorIds = new Set(connectors.map((connector) => connector.connectorId));
	const googleOAuthClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '';

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const configureCatalogConnector = (id: string): void => {
		navigate(`/settings/connectors/configure/${encodeURIComponent(id)}`);
	};

	const authorizeOAuthConnector = (connector: (typeof GOOGLE_WORKSPACE_OAUTH_CONNECTORS)[number]): void => {
		setOauthError(null);
		setOauthMessage(null);

		if (!googleOAuthClientId) {
			setOauthError(`Missing ${connector.oauth.clientIdEnvVar} for Google OAuth.`);
			return;
		}

		const params = new URLSearchParams({
			client_id: googleOAuthClientId,
			redirect_uri: connector.oauth.redirectUri,
			response_type: connector.oauth.responseType,
			scope: connector.oauth.scopes.join(' '),
			access_type: connector.oauth.accessType,
			include_granted_scopes: 'true',
			prompt: connector.oauth.prompt,
			state: connector.id,
		});

		openExternalUrl(`${connector.oauth.authorizationUrl}?${params.toString()}`);
		setOauthMessage(`${connector.name} OAuth request opened. Friday did not save a token.`);
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
				description="Authorize Google services through OAuth. Tokens are not stored in Friday yet."
			>
				<div className="grid gap-2">
					{GOOGLE_WORKSPACE_OAUTH_CONNECTORS.map((connector) => (
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
											{connector.capabilities.map((capability) => (
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
									className="w-full sm:w-auto"
									aria-label={`Authorize ${connector.name} with Google OAuth`}
									onClick={() => authorizeOAuthConnector(connector)}
								>
									<ExternalLink className="size-3.5" />
									Authorize
								</Button>
							</div>
						</SettingsPanel>
					))}
				</div>
			</SettingsSection>

			<SettingsSection title="MCP connectors">
				<div className="grid gap-2">
					{connectors.length === 0 ? (
						<SettingsPanel>
							<SettingsEmptyState
								icon={Plug}
								title="No connectors configured yet."
								description="Add a connector to make external tools available to agent runs."
							/>
						</SettingsPanel>
					) : (
						connectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								busy={busyId === connector.id}
								onToggle={() => void toggleConnector(connector)}
								onViewDetails={() => openConnectorDetails(connector.id)}
							/>
						))
					)}
					{catalog.map((item) => (
						<ConnectorCatalogItem
							key={item.id}
							item={item}
							onConfigure={() => configureCatalogConnector(item.id)}
							alreadyConfigured={configuredConnectorIds.has(item.id)}
						/>
					))}
				</div>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
