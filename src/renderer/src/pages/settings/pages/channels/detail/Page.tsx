import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
	CircleOff,
	Hash,
	KeyRound,
	Plus,
	RadioTower,
	ShieldCheck,
	UserRound,
	X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import type {
	Channel,
	ChannelAccountProperties,
	ChannelConnectionStatus,
	ChannelDmPolicy,
	ChannelType,
} from '../../../../../../../shared';
import {
	getChannelCatalogEntry,
	isChannelId,
} from '../../../../../../../shared';

type EditableChannelConfig = Channel[ChannelType];
type ListField = 'allowFrom' | 'groupAllowFrom';

const DM_POLICY_OPTIONS: readonly ChannelDmPolicy[] = ['allowlist', 'pairing', 'open', 'deny'];
const SETTINGS_INPUT_CLASS = 'h-8 w-full text-xs sm:w-80';

function getConnectionBadgeVariant(
	status: ChannelConnectionStatus
): 'secondary' | 'destructive' | 'outline' {
	if (status === 'connected') return 'secondary';
	if (status === 'error') return 'destructive';
	return 'outline';
}

const ChannelDetailPage: React.FC = () => {
	const { t } = useTranslation();
	const { channelId } = useParams<{ channelId: string }>();
	const selectedId = channelId && isChannelId(channelId) ? channelId : null;
	const [configs, setConfigs] = useState<Channel | null>(null);
	const [listDrafts, setListDrafts] = useState<Record<ListField, string>>({
		allowFrom: '',
		groupAllowFrom: '',
	});
	const [statusByChannel, setStatusByChannel] = useState<
		Partial<Record<ChannelType, ChannelConnectionStatus>>
	>({});
	const [busyChannel, setBusyChannel] = useState<ChannelType | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		Promise.all([window.channels.getConfig(), window.channels.getStatus()])
			.then(([nextConfig, telegramStatus]) => {
				if (!mounted) return;
				setConfigs(nextConfig);
				if (telegramStatus) {
					setStatusByChannel({ [telegramStatus.type]: telegramStatus.status });
				}
			})
			.catch((error) => {
				console.error('[ChannelDetailPage] Failed to load channel settings:', error);
				if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
			});

		const unsubscribe = window.channels.onStatusChanged((event) => {
			setStatusByChannel((current) => ({ ...current, [event.type]: event.status }));
			if (event.error) setLoadError(event.error);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, []);

	useEffect(() => {
		setListDrafts({ allowFrom: '', groupAllowFrom: '' });
	}, [selectedId]);

	const selectedEntry = selectedId ? getChannelCatalogEntry(selectedId) ?? null : null;
	const selectedConfig = selectedId ? configs?.[selectedId] ?? null : null;
	const selectedAccount = selectedConfig
		? getDefaultAccountConfig(selectedConfig)
		: emptyAccountConfig();
	const selectedStatus = selectedId ? statusByChannel[selectedId] ?? 'disconnected' : 'disconnected';
	const selectedTitle = selectedEntry?.label ?? t('settings.channels.configuration');

	const setSelectedConfig = (nextConfig: EditableChannelConfig): void => {
		if (!selectedId) return;
		setConfigs((current) => {
			if (!current) return current;
			return { ...current, [selectedId]: nextConfig };
		});
	};

	const saveChannelConfig = async (
		channelId: ChannelType,
		config: EditableChannelConfig
	): Promise<void> => {
		setBusyChannel(channelId);
		setLoadError(null);
		try {
			const saved = await window.channels.saveChannelConfig(channelId, config);
			setConfigs((current) => {
				if (!current) return current;
				return { ...current, [channelId]: saved };
			});
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyChannel(null);
		}
	};

	const saveSelectedConfig = async (): Promise<void> => {
		if (!configs || !selectedId) return;
		await saveChannelConfig(selectedId, configs[selectedId]);
	};

	const updateSelectedConfig = (
		updater: (config: EditableChannelConfig) => EditableChannelConfig,
		options?: { save?: boolean }
	): void => {
		if (!selectedConfig || !selectedId) return;
		const nextConfig = updater(selectedConfig);
		setSelectedConfig(nextConfig);
		if (options?.save) void saveChannelConfig(selectedId, nextConfig);
	};

	const updateAccountField = (
		field: keyof ChannelAccountProperties,
		value: ChannelAccountProperties[keyof ChannelAccountProperties],
		options?: { save?: boolean }
	): void => {
		if (!selectedId) return;
		updateSelectedConfig(
			(config) => updateDefaultAccountConfig(config, { [field]: value }),
			options
		);
	};

	const addListValue = (field: ListField): void => {
		const value = listDrafts[field].trim();
		if (!value) return;
		const nextValues = normalizeList([...(selectedAccount[field] ?? []), value]);
		setListDrafts((current) => ({ ...current, [field]: '' }));
		updateAccountField(field, nextValues, { save: true });
	};

	const removeListValue = (field: ListField, value: string): void => {
		updateAccountField(
			field,
			(selectedAccount[field] ?? []).filter((item) => item !== value),
			{ save: true }
		);
	};

	const handleRuntimeAction = async (action: 'start' | 'restart' | 'stop'): Promise<void> => {
		if (selectedId !== 'telegram') return;
		setBusyChannel('telegram');
		setLoadError(null);
		try {
			await saveSelectedConfig();
			const status =
				action === 'start'
					? await window.channels.startTelegram()
					: action === 'restart'
						? await window.channels.restartTelegram()
						: (await window.channels.stopTelegram(), undefined);
			setStatusByChannel((current) => ({
				...current,
				telegram: status?.status ?? (action === 'stop' ? 'disconnected' : current.telegram),
			}));
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : String(error));
		} finally {
			setBusyChannel(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={selectedTitle}
				description={selectedEntry?.blurb}
			/>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}
			{selectedEntry && selectedId !== 'telegram' && (
				<SettingsNotice icon={CircleOff}>
					{t('settings.channels.runtimeUnavailable')}
				</SettingsNotice>
			)}

			{selectedId ? (
				<SettingsSection title={t('settings.channels.configuration')}>
					<SettingsPanel>
						<SettingsRow
							title={t('settings.channels.enabled')}
							icon={ShieldCheck}
							actions={
								<Switch
									checked={isChannelEnabled(selectedConfig)}
									onCheckedChange={(checked) =>
										updateSelectedConfig((config) => updateChannelEnabled(config, checked), {
											save: true,
										})
									}
									aria-label={t('settings.channels.enabled')}
								/>
							}
						/>

						<SettingsRow
							title={t('settings.channels.token')}
							description={t('settings.channels.tokenDescription')}
							icon={KeyRound}
							actionClassName="w-full sm:w-80"
							actions={
								<Input
									id={`${selectedId}-token`}
									type="password"
									autoComplete="off"
									value={selectedAccount.token ?? ''}
									onChange={(event) => updateAccountField('token', event.target.value)}
									onBlur={() => void saveSelectedConfig()}
									placeholder={getTokenPlaceholder(selectedId, t)}
									className={SETTINGS_INPUT_CLASS}
									aria-label={t('settings.channels.token')}
								/>
							}
						/>

						<SettingsRow
							title={t('settings.channels.dmPolicy')}
							description={t('settings.channels.dmPolicyDescription')}
							icon={ShieldCheck}
							actionClassName="w-full sm:w-56"
							actions={
								<Select
									value={selectedAccount.dmPolicy ?? 'allowlist'}
									onValueChange={(value) =>
										updateAccountField('dmPolicy', value as ChannelDmPolicy, { save: true })
									}
								>
									<SelectTrigger id={`${selectedId}-dm-policy`} className="w-full text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DM_POLICY_OPTIONS.map((policy) => (
											<SelectItem key={policy} value={policy}>
												{t(`settings.channels.dmPolicies.${policy}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							}
						/>

						<SettingsRow
							title={t('settings.channels.allowFrom')}
							description={t('settings.channels.allowFromDescription')}
							icon={UserRound}
							className="items-start sm:items-center"
							actionClassName="w-full sm:w-[26rem]"
							actions={
								<ListEditor
									id={`${selectedId}-allow-from`}
									value={listDrafts.allowFrom}
									items={selectedAccount.allowFrom ?? []}
									placeholder={t('settings.channels.allowFromPlaceholder')}
									addLabel={t('settings.channels.addAllowFrom')}
									removeLabel={(item) => t('settings.channels.removeAllowFrom', { value: item })}
									emptyLabel={t('settings.channels.noAllowFrom')}
									onDraftChange={(value) =>
										setListDrafts((current) => ({ ...current, allowFrom: value }))
									}
									onAdd={() => addListValue('allowFrom')}
									onRemove={(value) => removeListValue('allowFrom', value)}
								/>
							}
						/>

						<SettingsRow
							title={t('settings.channels.groupAllowFrom')}
							description={t('settings.channels.groupAllowFromDescription')}
							icon={Hash}
							className="items-start sm:items-center"
							actionClassName="w-full sm:w-[26rem]"
							actions={
								<ListEditor
									id={`${selectedId}-group-allow-from`}
									value={listDrafts.groupAllowFrom}
									items={selectedAccount.groupAllowFrom ?? []}
									placeholder={t('settings.channels.groupAllowFromPlaceholder')}
									addLabel={t('settings.channels.addGroupAllowFrom')}
									removeLabel={(item) => t('settings.channels.removeGroupAllowFrom', { value: item })}
									emptyLabel={t('settings.channels.noGroupAllowFrom')}
									onDraftChange={(value) =>
										setListDrafts((current) => ({ ...current, groupAllowFrom: value }))
									}
									onAdd={() => addListValue('groupAllowFrom')}
									onRemove={(value) => removeListValue('groupAllowFrom', value)}
								/>
							}
						/>

						<SettingsRow
							title={t('settings.channels.status')}
							icon={RadioTower}
							actionClassName="flex-wrap justify-end gap-2"
							actions={
								<>
									<Badge
										variant={getConnectionBadgeVariant(selectedStatus)}
										className="h-4 px-1.5 text-[10px] capitalize"
									>
										{selectedStatus.replaceAll('_', ' ')}
									</Badge>
									{selectedId === 'telegram' ? (
										<ButtonGroup>
											<Button
												type="button"
												variant="outline"
												size="xs"
												disabled={busyChannel === 'telegram' || !selectedAccount.token?.trim()}
												onClick={() => void handleRuntimeAction('start')}
											>
												{t('settings.channels.pair')}
											</Button>
											<Button
												type="button"
												variant="outline"
												size="xs"
												disabled={busyChannel === 'telegram' || !selectedAccount.token?.trim()}
												onClick={() => void handleRuntimeAction('restart')}
											>
												{t('settings.channels.reconnect')}
											</Button>
											<Button
												type="button"
												variant="outline"
												size="xs"
												disabled={busyChannel === 'telegram'}
												onClick={() => void handleRuntimeAction('stop')}
											>
												{t('common.close')}
											</Button>
										</ButtonGroup>
									) : (
										<CircleOff className="size-3.5 text-muted-foreground" />
									)}
								</>
							}
						/>
					</SettingsPanel>
				</SettingsSection>
			) : (
				<SettingsNotice variant="destructive">
					{t('settings.channels.notConfigured')}
				</SettingsNotice>
			)}
		</SettingsPageShell>
	);
};

function ListEditor({
	id,
	value,
	items,
	placeholder,
	addLabel,
	removeLabel,
	emptyLabel,
	onDraftChange,
	onAdd,
	onRemove,
}: {
	readonly id: string;
	readonly value: string;
	readonly items: readonly string[];
	readonly placeholder: string;
	readonly addLabel: string;
	readonly removeLabel: (item: string) => string;
	readonly emptyLabel: string;
	readonly onDraftChange: (value: string) => void;
	readonly onAdd: () => void;
	readonly onRemove: (value: string) => void;
}): React.JSX.Element {
	return (
		<div className="flex w-full min-w-0 flex-col gap-1.5">
			<InputGroup className="h-8">
				<InputGroupInput
					id={id}
					value={value}
					onChange={(event) => onDraftChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							onAdd();
						}
					}}
					placeholder={placeholder}
					className="text-xs"
					aria-label={placeholder}
				/>
				<InputGroupAddon align="inline-end" className="py-0 pr-1">
					<InputGroupButton
						type="button"
						size="icon-xs"
						onClick={onAdd}
						aria-label={addLabel}
						title={addLabel}
					>
						<Plus className="size-3" />
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			<div className="flex min-h-6 flex-wrap items-center gap-1.5">
				{items.length > 0 ? (
					items.map((item) => (
						<Badge
							key={item}
							variant="outline"
							className="h-4 max-w-full gap-1 px-1.5 pr-0.5 text-[10px]"
						>
							<span className="max-w-48 truncate">{item}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={() => onRemove(item)}
								className="size-4 rounded-sm p-0 text-muted-foreground hover:text-foreground"
								aria-label={removeLabel(item)}
							>
								<X className="size-2.5" />
							</Button>
						</Badge>
					))
				) : (
					<span className="text-[11px] text-muted-foreground">{emptyLabel}</span>
				)}
			</div>
		</div>
	);
}

function getDefaultAccountConfig(config: EditableChannelConfig): ChannelAccountProperties {
	const account = config.accounts?.[config.defaultAccountId ?? 'default'];
	return {
		...account,
		enabled: config.enabled ?? account?.enabled ?? false,
		token: account?.token ?? config.token,
		allowFrom: account?.allowFrom ?? config.allowFrom,
		groupAllowFrom: account?.groupAllowFrom ?? config.groupAllowFrom ?? [],
		dmPolicy: account?.dmPolicy ?? config.dmPolicy ?? 'allowlist',
	};
}

function updateDefaultAccountConfig(
	config: EditableChannelConfig,
	patch: Partial<ChannelAccountProperties>
): EditableChannelConfig {
	const nextAccount = { ...getDefaultAccountConfig(config), ...patch };
	return {
		...config,
		token: nextAccount.token ?? '',
		allowFrom: normalizeList(nextAccount.allowFrom ?? []),
		groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
		dmPolicy: nextAccount.dmPolicy,
		accounts: {
			...(config.accounts ?? {}),
			default: nextAccount,
		},
	};
}

function updateChannelEnabled(
	config: EditableChannelConfig,
	enabled: boolean
): EditableChannelConfig {
	return updateDefaultAccountConfig({ ...config, enabled }, { enabled });
}

function isChannelEnabled(config: EditableChannelConfig | null | undefined): boolean {
	if (!config) return false;
	return Boolean(config.enabled ?? getDefaultAccountConfig(config).enabled);
}

function emptyAccountConfig(): ChannelAccountProperties {
	return {
		enabled: false,
		token: '',
		allowFrom: [],
		groupAllowFrom: [],
		dmPolicy: 'allowlist',
	};
}

function normalizeList(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getTokenPlaceholder(channelId: ChannelType, t: (key: string) => string): string {
	return channelId === 'telegram'
		? t('settings.channels.telegramTokenPlaceholder')
		: t('settings.channels.discordTokenPlaceholder');
}

export default ChannelDetailPage;
