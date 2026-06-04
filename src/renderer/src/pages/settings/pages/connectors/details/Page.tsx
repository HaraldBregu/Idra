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
import { SETTINGS_CONNECTOR_CATALOG } from '../catalog';

type ConnectorRecord = Awaited<ReturnType<typeof window.connectors.get>>;
type ConnectorEntry = ConnectorRecord[string];

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatApprovalPolicy(value: ConnectorEntry['require_approval']): string {
	return value ?? 'always';
}

function connectorRecordEntry(
	record: ConnectorRecord,
	preferredId?: string
): { id: string; connector: ConnectorEntry } | undefined {
	const entry = preferredId ? record[preferredId] : undefined;
	if (preferredId && entry) return { id: preferredId, connector: entry };
	const [id, connector] = Object.entries(record)[0] ?? [];
	return id && connector ? { id, connector } : undefined;
}

function connectorName(id: string, connector: ConnectorEntry): string {
	const serverLabel = connector.server_label
		.split(/[_-]+/u)
		.map((part) => part ? part[0].toUpperCase() + part.slice(1) : '')
		.join(' ')
		.trim();
	return (
		SETTINGS_CONNECTOR_CATALOG.find((entry) => entry.directConnectorId === id)?.name ??
		(serverLabel || id)
	);
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

		void window.connectors.get(connectorId).then(
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
	const authLabel = connector.authorization ? 'Access token' : 'Remote MCP';
	const displayName = connectorName(id, connector);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={displayName}
				description={connector.server_description}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Configuration">
				<Card size="sm" className="gap-0! p-0!">
					<DetailRow label="Connector" value={id} mono />
					<DetailRow label="Server label" value={connector.server_label} mono />
					<DetailRow label="Server URL" value={connector.server_url} mono />
					<DetailRow label="Enabled" value={connector.enabled === false ? 'Disabled' : 'Enabled'} />
					<DetailRow label="Approval policy" value={formatApprovalPolicy(connector.require_approval)} />
					<DetailRow label="Auth" value={authLabel} />
					<DetailRow label="Last refreshed" value={formatTimestamp(connector.last_refreshed_at)} />
					<DetailRow label="Updated" value={formatTimestamp(connector.updated_at)} />
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
