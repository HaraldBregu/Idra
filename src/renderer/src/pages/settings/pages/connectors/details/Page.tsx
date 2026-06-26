import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import { ConnectorStatusBadge } from '../components/ConnectorStatusBadge';

type ConnectorRecord = Awaited<ReturnType<typeof window.connectors.list>>;
type ConnectorEntry = ConnectorRecord[string];

function connectorStatus(connector: ConnectorEntry): 'configured' | 'disabled' | 'error' {
	if (connector.enabled === false) return 'disabled';
	if (connector.last_error) return 'error';
	return 'configured';
}

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function connectorRecordEntry(
	record: ConnectorRecord,
	preferredId?: string
): { id: string; connector: ConnectorEntry } | undefined {
	const entry = preferredId ? record[preferredId] : undefined;
	const id = preferredId && entry ? preferredId : (Object.entries(record)[0]?.[0]);
	const connector = id ? record[id] : undefined;
	if (!id || !connector) return undefined;
	return { id, connector };
}

const ConnectorDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const { connectorId } = useParams<{ connectorId: string }>();
	const [connectorRecord, setConnectorRecord] = useState<ConnectorRecord | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		if (!connectorId) {
			setLoading(false);
			setError(t('settings.connectors.notFoundDescription'));
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		setError(null);

		void window.connectors.listServers().then(
			(nextConnector) => {
				if (!mounted) return;
				setConnectorRecord(nextConnector);
				setError(null);
				setLoading(false);
			},
			(caught) => {
				if (!mounted) return;
				setConnectorRecord(null);
				setError(caught instanceof Error ? caught.message : String(caught));
				setLoading(false);
			}
		);

		return () => {
			mounted = false;
		};
	}, [connectorId, t]);

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

	const selected = connectorRecordEntry(connectorRecord ?? {}, connectorId);
	if (!selected) {
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

	const { id, connector } = selected;
	const httpConnector = connector.type === 'http' ? connector : undefined;
	const stdioConnector = connector.type === 'stdio' ? connector : undefined;
	const authLabel = httpConnector?.token ? 'Access token' : 'Remote MCP';
	const displayName = id;
	const status = connectorStatus(connector);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={displayName} />

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Configuration">
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Name</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{id}</span>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Status</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<ConnectorStatusBadge status={status} />
						</ItemActions>
					</Item>
					{httpConnector && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Server URL</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{httpConnector.url}</span>
							</ItemActions>
						</Item>
					)}
					{stdioConnector && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Command</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{stdioConnector.command}</span>
							</ItemActions>
						</Item>
					)}
					{stdioConnector && stdioConnector.args && stdioConnector.args.length > 0 && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Arguments</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{stdioConnector.args.join(' ')}</span>
							</ItemActions>
						</Item>
					)}
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Auth</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground">{authLabel}</span>
						</ItemActions>
					</Item>
					{httpConnector && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Last refreshed</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground">{formatTimestamp(httpConnector.last_refreshed_at)}</span>
							</ItemActions>
						</Item>
					)}
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Updated</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground">{formatTimestamp(connector.updated_at)}</span>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			{connector.last_error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{connector.last_error}
				</SettingsNotice>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorDetailsPage;
