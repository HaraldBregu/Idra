import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import { ConnectorTools } from '../components/ConnectorTools';

type ConnectorRecord = Awaited<ReturnType<typeof window.connectors.get>>;
type ConnectorEntry = ConnectorRecord[string];
type ApprovalPolicy = NonNullable<ConnectorEntry['require_approval']>;

const APPROVAL_POLICIES = ['always', 'never'] as const satisfies readonly ApprovalPolicy[];

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatApprovalPolicy(value: ConnectorEntry['require_approval']): string {
	return value ?? 'always';
}

function isApprovalPolicy(value: string): value is ApprovalPolicy {
	return APPROVAL_POLICIES.includes(value as ApprovalPolicy);
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
	const [savingApproval, setSavingApproval] = useState(false);
	const [savingEnabled, setSavingEnabled] = useState(false);

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
	const httpConnector = connector.type === 'http' ? connector : undefined;
	const authLabel = httpConnector?.token ? 'Access token' : 'Remote MCP';
	const displayName = id;
	const approvalPolicy = formatApprovalPolicy(connector.require_approval);
	const enabled = connector.enabled !== false;

	const handleEnabledChange = async (checked: boolean): Promise<void> => {
		if (checked === enabled) return;

		const previousRecord = connectorRecord;
		const optimisticRecord: ConnectorRecord = {
			...(connectorRecord ?? {}),
			[id]: {
				...connector,
				enabled: checked,
			},
		};

		setSavingEnabled(true);
		setError(null);
		setConnectorRecord(optimisticRecord);

		try {
			const nextRecord = await window.connectors.upsert({
				id,
				name: displayName,
				enabled: checked,
			});
			setConnectorRecord(nextRecord);
		} catch (caught) {
			setConnectorRecord(previousRecord);
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSavingEnabled(false);
		}
	};

	const handleApprovalPolicyChange = async (value: string): Promise<void> => {
		if (!isApprovalPolicy(value) || value === approvalPolicy) return;

		const previousRecord = connectorRecord;
		const optimisticRecord: ConnectorRecord = {
			...(connectorRecord ?? {}),
			[id]: {
				...connector,
				require_approval: value,
			},
		};

		setSavingApproval(true);
		setError(null);
		setConnectorRecord(optimisticRecord);

		try {
			const nextRecord = await window.connectors.upsert({
				id,
				name: displayName,
				requireApproval: value,
			});
			setConnectorRecord(nextRecord);
		} catch (caught) {
			setConnectorRecord(previousRecord);
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSavingApproval(false);
		}
	};

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
						<ItemContent><ItemTitle>Connector</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{id}</span>
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
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Enabled</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch
								checked={enabled}
								disabled={savingEnabled}
								onCheckedChange={(checked) => void handleEnabledChange(checked)}
								aria-label="Enabled"
							/>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Require approval</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Select
								value={approvalPolicy}
								onValueChange={(value) => {
									if (value) void handleApprovalPolicyChange(value);
								}}
								disabled={savingApproval}
							>
								<SelectTrigger className="w-44 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="always">Always require approval</SelectItem>
									<SelectItem value="never">Never require approval</SelectItem>
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
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

			<SettingsSection title="Tools">
				<ConnectorTools id={id} />
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
