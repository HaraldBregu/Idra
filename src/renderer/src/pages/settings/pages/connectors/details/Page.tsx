import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Plug, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { ConnectorConfig, ConnectorTool } from '../../../../../../../shared/connectors';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import { ConnectorToolsList } from '../components/ConnectorToolsList';

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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
	const [connector, setConnector] = useState<ConnectorConfig | null>(null);
	const [tools, setTools] = useState<readonly ConnectorTool[]>([]);
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
		Promise.all([
			window.connectors.get(connectorId),
			window.connectors.listTools(connectorId),
		])
			.then(([nextConnector, nextTools]) => {
				if (!mounted) return;
				setConnector(nextConnector);
				setTools(nextTools);
				setError(null);
			})
			.catch((caught) => {
				if (!mounted) return;
				setConnector(null);
				setTools([]);
				setError(caught instanceof Error ? caught.message : String(caught));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

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

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={connector.name}
				description={connector.serverDescription}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Configuration">
				<Card size="sm" className="gap-0! p-0!">
					<DetailRow label="Connector" value={connector.connectorId} mono />
					<DetailRow label="Server label" value={connector.serverLabel} mono />
					<DetailRow label="Enabled" value={connector.enabled ? 'Enabled' : 'Disabled'} />
					<DetailRow label="Approval policy" value={connector.requireApproval.replaceAll('_', ' ')} />
					<DetailRow label="Auth" value={connector.oauth ? 'Google OAuth' : 'Access token'} />
					<DetailRow label="Connected account" value={connector.oauth?.email ?? '—'} />
					<DetailRow label="Last refreshed" value={formatTimestamp(connector.lastRefreshedAt)} />
					<DetailRow label="Updated" value={formatTimestamp(connector.updatedAt)} />
				</Card>
			</SettingsSection>

			{connector.lastError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{connector.lastError}
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
		</SettingsPageShell>
	);
};

export default ConnectorDetailsPage;
