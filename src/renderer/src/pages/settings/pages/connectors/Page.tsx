import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
} from '../../components';
import { ConnectorIcon } from './components/ConnectorIcon';
import { useConnectors } from './hooks/useConnectors';

type HardcodedOAuthConnector = Exclude<Parameters<Window['connectors']['authorizeOAuth']>[0], string>;

const GOOGLE_GMAIL_CONNECTORS: readonly HardcodedOAuthConnector[] = [
	{
		id: 'google.gmail',
		name: 'Gmail',
		description: 'Authorize the official Gmail MCP server.',
		directConnectorId: 'gmail',
		environmentSecretNames: [],
		platformDocumentationPages: [],
		tools: [],
		scopes: [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/gmail.readonly',
			'https://www.googleapis.com/auth/gmail.compose',
			'https://www.googleapis.com/auth/gmail.send',
			'https://www.googleapis.com/auth/gmail.modify',
		],
		setupInstructions: [],
		authKind: 'oauth',
		runtimeKind: 'mcp',
		allowMultipleInstances: false,
		mcp: {
			transport: 'http',
			url: 'https://gmailmcp.googleapis.com/mcp/v1',
			method: 'POST',
			headers: {
				accept: 'application/json, text/event-stream',
				'content-type': 'application/json',
			},
		},
		oauth: {
			providerId: 'google',
			clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
			clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
			authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
			tokenUrl: 'https://oauth2.googleapis.com/token',
			redirectUri: 'http://127.0.0.1',
			authorizationParams: {
				response_type: 'code',
				access_type: 'offline',
				include_granted_scopes: 'true',
				prompt: 'consent',
			},
		},
	},
];

const ConnectorsPage = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [oauthError, setOauthError] = useState<string | null>(null);
	const [refreshedToolIds, setRefreshedToolIds] = useState<ReadonlySet<string>>(new Set());
	const {
		connectors,
		error,
		statusMessage,
		refreshTools,
	} = useConnectors();
	const oauthConnectorByProviderId = new Map(
		connectors.filter((c) => c.authKind === 'oauth').map((c) => [c.connectorId, c])
	);

	useEffect(() => {
		const connector = connectors.find((item) =>
			item.authKind === 'oauth' && item.id && !item.hasTools && !refreshedToolIds.has(item.id)
		);
		if (!connector?.id) return;
		setRefreshedToolIds((current) => new Set(current).add(connector.id!));
		void refreshTools(connector.id);
	}, [connectors, refreshedToolIds, refreshTools]);

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const authorizeOAuthConnector = async (connector: HardcodedOAuthConnector): Promise<void> => {
		setOauthError(null);
		try {
			await window.connectors.authorizeOAuth(connector);
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

			<div className="grid gap-2">
				{GOOGLE_GMAIL_CONNECTORS.map((connector) => {
					const existing = oauthConnectorByProviderId.get(connector.id);
					const existingId = existing?.id;
					const handleClick = existing?.hasToken && existingId
						? () => openConnectorDetails(existingId)
						: () => void authorizeOAuthConnector(connector);
					return (
						<Item
							key={connector.id}
							variant="outline"
							size="md"
							onClick={handleClick}
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
					);
				})}
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
