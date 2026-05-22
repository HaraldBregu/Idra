import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, LoaderCircle, Plug, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	getConnectorCatalogItem,
	getConnectorAuthKind,
	type ConnectorConfig,
	type ConnectorTool,
} from '../../../../../../../shared/connector';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import { ConnectorDocumentationRows } from '../components/ConnectorDocumentationRows';
import { ConnectorToolsList } from '../components/ConnectorToolsList';

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatApprovalPolicy(value: ConnectorConfig['requireApproval']): string {
	return value.replaceAll('_', ' ');
}

function DetailRow({
	label,
	value,
	mono,
}: {
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<Item variant="outline" size="md" className="border-b border-border/60">
			<ItemContent>
				<ItemTitle>{label}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
				<span
					className={
						mono
							? 'max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground'
							: 'max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground'
					}
				>
					{value}
				</span>
			</ItemActions>
		</Item>
	);
}

const ConnectorDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { connectorId } = useParams<{ connectorId: string }>();
	const [connector, setConnector] = useState<ConnectorConfig | null>(null);
	const [tools, setTools] = useState<readonly ConnectorTool[]>([]);
	const [loading, setLoading] = useState(true);
	const [connecting, setConnecting] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [toolsError, setToolsError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		if (!connectorId) {
			setLoading(false);
			setError(t('settings.connectors.notFoundDescription'));
			setToolsError(null);
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		setError(null);
		setStatusMessage(null);
		setToolsError(null);

		void (async () => {
			try {
				const nextConnector = await window.connectors.get(connectorId);
				if (!mounted) return;

				let nextTools: readonly ConnectorTool[] = [];
				let nextToolsError: string | null = null;
				try {
					nextTools = await window.connectors.listTools(connectorId);
				} catch (caught) {
					nextToolsError = caught instanceof Error ? caught.message : String(caught);
				}
				if (!mounted) return;

				setConnector(nextConnector);
				setTools(nextTools);
				setError(null);
				setToolsError(nextToolsError);
			} catch (caught) {
				if (!mounted) return;
				setConnector(null);
				setTools([]);
				setError(caught instanceof Error ? caught.message : String(caught));
				setToolsError(null);
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [connectorId, t]);

	const connectGoogleOAuth = async (): Promise<void> => {
		if (!connector) return;
		setConnecting(true);
		setError(null);
		setStatusMessage(`Opening browser for ${connector.name}...`);
		try {
			const result = await window.connectors.connectOAuth(connector.id);
			const [nextConnector, nextTools] = await Promise.all([
				window.connectors.get(connector.id),
				window.connectors.listTools(connector.id),
			]);
			setConnector(nextConnector);
			setTools(nextTools);
			setStatusMessage(result.message ?? `${connector.name} connected.`);
			setToolsError(null);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			setStatusMessage(null);
		} finally {
			setConnecting(false);
		}
	};

	const deleteConnector = async (): Promise<void> => {
		if (!connector) return;
		if (!window.confirm(`Delete ${connector.name}?`)) return;

		setDeleting(true);
		setError(null);
		setStatusMessage(null);
		try {
			await window.connectors.remove(connector.id);
			navigate('/settings/connectors');
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.connectors.detailsTitle')} />
				<Card size="sm" className="gap-0! p-3!">
					<Skeleton className="h-5 w-56 max-w-full" />
					<Skeleton className="mt-3 h-16 w-full" />
				</Card>
			</SettingsPageShell>
		);
	}

	if (!connector) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.connectors.detailsTitle')} />
				<Card size="sm" className="gap-0! p-0!">
					<SettingsEmptyState
						icon={Plug}
						title={t('settings.connectors.notFoundTitle')}
						description={error ?? t('settings.connectors.notFoundDescription')}
						className="min-h-28"
					/>
				</Card>
			</SettingsPageShell>
		);
	}

	const authKind = getConnectorAuthKind(connector.connectorId);
	const googleOAuth = authKind === 'google_oauth';
	const catalogItem = getConnectorCatalogItem(connector.connectorId);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={connector.name}
				description={connector.serverDescription}
				action={
					googleOAuth ? (
						<Button
							type="button"
							size="xs"
							variant={connector.oauth?.refreshToken || connector.oauth?.accessToken ? 'outline' : 'default'}
							disabled={connecting || deleting}
							onClick={() => void connectGoogleOAuth()}
						>
							{connecting && <LoaderCircle className="size-3 animate-spin" />}
							{connector.oauth?.refreshToken || connector.oauth?.accessToken ? 'Reconnect Google' : 'Connect Google'}
						</Button>
					) : undefined
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{statusMessage && <SettingsNotice variant="default">{statusMessage}</SettingsNotice>}

			<SettingsSection title="Configuration">
				<Card size="sm" className="gap-0! p-0!">
					<DetailRow label="Connector" value={connector.connectorId} mono />
					<DetailRow label="Server label" value={connector.serverLabel} mono />
					<DetailRow label="Enabled" value={connector.enabled ? 'Enabled' : 'Disabled'} />
					<DetailRow label="Approval policy" value={formatApprovalPolicy(connector.requireApproval)} />
					<DetailRow label="Auth" value={googleOAuth ? 'Google OAuth' : 'Access token'} />
					{googleOAuth && (
						<DetailRow
							label="OAuth client"
							value="Environment variables"
						/>
					)}
					<DetailRow label="Connected account" value={connector.oauth?.email ?? 'Not connected'} />
					<DetailRow label="Last refreshed" value={formatTimestamp(connector.lastRefreshedAt)} />
					<DetailRow label="Updated" value={formatTimestamp(connector.updatedAt)} />
				</Card>
			</SettingsSection>

			{catalogItem && (
				<SettingsSection title="Documentation">
					<Card size="sm" className="gap-0! p-0!">
						<ConnectorDocumentationRows connector={catalogItem} />
					</Card>
				</SettingsSection>
			)}

			{connector.lastError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{connector.lastError}
				</SettingsNotice>
			)}

			{toolsError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{toolsError}
				</SettingsNotice>
			)}

			<SettingsSection
				title="Tools"
				action={
					<Badge
						variant="outline"
						className="h-5 rounded-md bg-muted/40 px-1.5 text-[10px] text-muted-foreground"
					>
						<Wrench className="mr-1 size-3" />
						{tools.length} tools
					</Badge>
				}
			>
				<ConnectorToolsList tools={tools} />
			</SettingsSection>

			<div className="border-t border-border/60 pt-3">
				<Button
					type="button"
					size="lg"
					variant="destructive"
					className="w-full"
					disabled={connecting || deleting}
					onClick={() => void deleteConnector()}
				>
					{deleting ? (
						<LoaderCircle className="size-3 animate-spin" />
					) : (
						<Trash2 className="size-3" />
					)}
					{deleting ? 'Deleting...' : 'Delete Connector'}
				</Button>
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorDetailsPage;
