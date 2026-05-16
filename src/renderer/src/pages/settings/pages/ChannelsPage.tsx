import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Bot,
	CheckCircle2,
	CircleOff,
	Hash,
	KeyRound,
	Link2,
	MessageCircleMore,
	Phone,
	Plus,
	RadioTower,
	Save,
	Search,
	Send,
	Server,
	ShieldCheck,
	UserRound,
	X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ButtonGroup } from '@/components/ui/button-group';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../components';
import type {
	Channel,
	ChannelAccountProperties,
	ChannelConnectionStatus,
	ChannelDmPolicy,
	ChannelType,
	DiscordChannelProperties,
	GenericChannelProperties,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from '../../../../../shared/channels';
import type { ChannelCatalogEntry } from '../../../../../shared/channel-catalog';

type EditableChannelConfig = Channel[ChannelType];
type ListField = 'allowFrom' | 'groupAllowFrom';

const RUNTIME_CHANNELS = new Set<ChannelType>(['telegram']);
const PHONE_CHANNELS = new Set<ChannelType>([
	'imessage',
	'line',
	'qqbot',
	'signal',
	'telegram',
	'whatsapp',
	'zalo',
	'zalouser',
]);
const SERVER_CHANNELS = new Set<ChannelType>([
	'discord',
	'feishu',
	'googlechat',
	'irc',
	'matrix',
	'mattermost',
	'msteams',
	'nextcloud-talk',
	'nostr',
	'slack',
	'synology-chat',
	'tlon',
	'twitch',
]);

const CHANNEL_ICONS: Partial<Record<ChannelType, typeof Send>> = {
	discord: MessageCircleMore,
	slack: Hash,
	telegram: Send,
	whatsapp: Phone,
};

const DM_POLICY_OPTIONS: readonly ChannelDmPolicy[] = ['allowlist', 'pairing', 'open', 'deny'];

function getConnectionBadgeVariant(
	status: ChannelConnectionStatus
): 'secondary' | 'destructive' | 'outline' {
	if (status === 'connected') return 'secondary';
	if (status === 'error') return 'destructive';
	return 'outline';
}

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const [catalog, setCatalog] = useState<readonly ChannelCatalogEntry[]>([]);
	const [configs, setConfigs] = useState<Channel | null>(null);
	const [selectedId, setSelectedId] = useState<ChannelType>('telegram');
	const [filter, setFilter] = useState('');
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

		Promise.all([window.channels.listCatalog(), window.channels.getConfig(), window.channels.getStatus()])
			.then(([nextCatalog, nextConfig, telegramStatus]) => {
				if (!mounted) return;
				setCatalog(nextCatalog);
				setConfigs(nextConfig);
				if (telegramStatus) {
					setStatusByChannel({ [telegramStatus.type]: telegramStatus.status });
				}
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load channel settings:', error);
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

	const filteredCatalog = useMemo(() => {
		const query = filter.trim().toLowerCase();
		if (!query) return catalog;
		return catalog.filter((entry) => {
			return (
				entry.id.includes(query) ||
				entry.label.toLowerCase().includes(query) ||
				entry.blurb.toLowerCase().includes(query) ||
				entry.aliases.some((alias) => alias.includes(query))
			);
		});
	}, [catalog, filter]);

	const selectedEntry = catalog.find((entry) => entry.id === selectedId);
	const selectedConfig = configs?.[selectedId] ?? null;
	const selectedAccount = selectedConfig
		? getDefaultAccountConfig(selectedId, selectedConfig)
		: emptyAccountConfig(selectedId);
	const selectedStatus = statusByChannel[selectedId] ?? 'disconnected';

	const setSelectedConfig = (nextConfig: EditableChannelConfig): void => {
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
		if (!configs) return;
		await saveChannelConfig(selectedId, configs[selectedId]);
	};

	const updateSelectedConfig = (
		updater: (config: EditableChannelConfig) => EditableChannelConfig,
		options?: { save?: boolean }
	): void => {
		if (!selectedConfig) return;
		const nextConfig = updater(selectedConfig);
		setSelectedConfig(nextConfig);
		if (options?.save) void saveChannelConfig(selectedId, nextConfig);
	};

	const updateAccountField = (
		field: keyof ChannelAccountProperties,
		value: ChannelAccountProperties[keyof ChannelAccountProperties],
		options?: { save?: boolean }
	): void => {
		updateSelectedConfig(
			(config) => updateDefaultAccountConfig(selectedId, config, { [field]: value }),
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
		<SettingsPageShell className="max-w-6xl">
			<SettingsPageHeader
				title={t('settings.tabs.channels')}
				description={t('settings.channels.description')}
				action={
					<Button
						type="button"
						variant="outline"
						size="xs"
						disabled={!selectedConfig || busyChannel === selectedId}
						onClick={() => void saveSelectedConfig()}
					>
						<Save className="size-3" />
						{t('common.save')}
					</Button>
				}
			/>

			<div className="grid gap-3 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
				<SettingsSection
					title={t('settings.channels.catalog')}
					action={
						<InputGroup className="h-7 w-full sm:w-56">
							<InputGroupInput
								value={filter}
								onChange={(event) => setFilter(event.target.value)}
								placeholder={t('settings.channels.searchPlaceholder')}
								className="h-7 min-w-0 px-2 text-xs md:text-xs"
								aria-label={t('settings.channels.searchPlaceholder')}
							/>
							<InputGroupAddon align="inline-start">
								<Search className="size-3 text-muted-foreground" />
							</InputGroupAddon>
						</InputGroup>
					}
				>
					<SettingsPanel>
						<div className="grid max-h-[620px] overflow-y-auto p-1.5">
							{filteredCatalog.map((entry) => {
								const Icon = CHANNEL_ICONS[entry.id] ?? Bot;
								const config = configs?.[entry.id];
								const account = config
									? getDefaultAccountConfig(entry.id, config)
									: emptyAccountConfig(entry.id);
								const isSelected = entry.id === selectedId;
								const isEnabled = isChannelEnabled(entry.id, config);
								const isConfigured = isAccountConfigured(account);

								return (
									<button
										key={entry.id}
										type="button"
										onClick={() => setSelectedId(entry.id)}
										className={cn(
											'grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
											isSelected && 'bg-muted text-foreground'
										)}
									>
										<span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border/70">
											<Icon className="size-3.5" />
										</span>
										<span className="min-w-0">
											<span className="flex min-w-0 items-center gap-1.5">
												<span className="truncate text-xs font-medium">{entry.label}</span>
												{isEnabled && (
													<CheckCircle2 className="size-3 shrink-0 text-emerald-600" />
												)}
											</span>
											<span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
												{entry.blurb}
											</span>
											<span className="mt-1 flex flex-wrap gap-1">
												<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
													{isConfigured
														? t('settings.channels.configured')
														: t('settings.channels.notConfigured')}
												</Badge>
												<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
													{RUNTIME_CHANNELS.has(entry.id)
														? t('settings.channels.runtime')
														: t('settings.channels.configOnly')}
												</Badge>
											</span>
										</span>
									</button>
								);
							})}
						</div>
					</SettingsPanel>
				</SettingsSection>

				<SettingsSection
					title={selectedEntry?.label ?? t('settings.channels.configuration')}
					description={selectedEntry?.blurb}
					action={
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge variant="outline" className="h-5 px-2 text-[10px]">
								{selectedId}
							</Badge>
							<Badge
								variant={isChannelEnabled(selectedId, selectedConfig) ? 'secondary' : 'outline'}
								className="h-5 px-2 text-[10px]"
							>
								{isChannelEnabled(selectedId, selectedConfig)
									? t('settings.channels.enabled')
									: t('settings.channels.disabled')}
							</Badge>
						</div>
					}
				>
					<SettingsPanel>
						<SettingsRow
							icon={ShieldCheck}
							title={t('settings.channels.enabled')}
							description={t('settings.channels.enabledDescription')}
							actions={
								<Switch
									size="sm"
									checked={isChannelEnabled(selectedId, selectedConfig)}
									onCheckedChange={(checked) =>
										updateSelectedConfig((config) => updateChannelEnabled(selectedId, config, checked), {
											save: true,
										})
									}
									aria-label={t('settings.channels.enabled')}
								/>
							}
						/>

						<SettingsRow
							icon={UserRound}
							title={t('settings.channels.accountLabel')}
							description={t('settings.channels.accountLabelDescription')}
							actions={
								<Input
									value={selectedAccount.label ?? ''}
									onChange={(event) => updateAccountField('label', event.target.value)}
									onBlur={() => void saveSelectedConfig()}
									placeholder={t('settings.channels.accountLabelPlaceholder')}
									className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
									aria-label={t('settings.channels.accountLabel')}
								/>
							}
						/>

						<SettingsRow
							icon={KeyRound}
							title={t('settings.channels.token')}
							description={t('settings.channels.tokenDescription')}
							actions={
								<Input
									type="password"
									value={selectedAccount.token ?? ''}
									onChange={(event) => updateAccountField('token', event.target.value)}
									onBlur={() => void saveSelectedConfig()}
									placeholder={getTokenPlaceholder(selectedId, t)}
									className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
									aria-label={t('settings.channels.token')}
								/>
							}
						/>

						{PHONE_CHANNELS.has(selectedId) && (
							<SettingsRow
								icon={Phone}
								title={t('settings.channels.phoneNumber')}
								description={t('settings.channels.phoneNumberDescription')}
								actions={
									<Input
										type="tel"
										value={selectedAccount.phoneNumber ?? ''}
										onChange={(event) => updateAccountField('phoneNumber', event.target.value)}
										onBlur={() => void saveSelectedConfig()}
										placeholder={t('settings.channels.phoneNumberPlaceholder')}
										className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
										aria-label={t('settings.channels.phoneNumber')}
									/>
								}
							/>
						)}

						{SERVER_CHANNELS.has(selectedId) && (
							<SettingsRow
								icon={Server}
								title={t('settings.channels.serverUrl')}
								description={t('settings.channels.serverUrlDescription')}
								actions={
									<Input
										value={selectedAccount.serverUrl ?? ''}
										onChange={(event) => updateAccountField('serverUrl', event.target.value)}
										onBlur={() => void saveSelectedConfig()}
										placeholder={t('settings.channels.serverUrlPlaceholder')}
										className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
										aria-label={t('settings.channels.serverUrl')}
									/>
								}
							/>
						)}

						<SettingsRow
							icon={Link2}
							title={t('settings.channels.webhookUrl')}
							description={t('settings.channels.webhookUrlDescription')}
							actions={
								<Input
									value={selectedAccount.webhookUrl ?? ''}
									onChange={(event) => updateAccountField('webhookUrl', event.target.value)}
									onBlur={() => void saveSelectedConfig()}
									placeholder={t('settings.channels.webhookUrlPlaceholder')}
									className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
									aria-label={t('settings.channels.webhookUrl')}
								/>
							}
						/>

						<SettingsRow
							icon={Hash}
							title={t('settings.channels.defaultTarget')}
							description={t('settings.channels.defaultTargetDescription')}
							actions={
								<Input
									value={selectedAccount.defaultTarget ?? ''}
									onChange={(event) => updateAccountField('defaultTarget', event.target.value)}
									onBlur={() => void saveSelectedConfig()}
									placeholder={t('settings.channels.defaultTargetPlaceholder')}
									className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
									aria-label={t('settings.channels.defaultTarget')}
								/>
							}
						/>

						<SettingsRow
							icon={ShieldCheck}
							title={t('settings.channels.dmPolicy')}
							description={t('settings.channels.dmPolicyDescription')}
							actions={
								<Select
									value={selectedAccount.dmPolicy ?? 'allowlist'}
									onValueChange={(value) =>
										updateAccountField('dmPolicy', value as ChannelDmPolicy, { save: true })
									}
								>
									<SelectTrigger size="sm" className="w-full sm:w-56">
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
							icon={UserRound}
							title={t('settings.channels.allowFrom')}
							description={t('settings.channels.allowFromDescription')}
							actionClassName="sm:w-[26rem]"
							actions={
								<ListEditor
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
							icon={Hash}
							title={t('settings.channels.groupAllowFrom')}
							description={t('settings.channels.groupAllowFromDescription')}
							actionClassName="sm:w-[26rem]"
							actions={
								<ListEditor
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
							icon={RadioTower}
							title={t('settings.channels.status')}
							description={
								RUNTIME_CHANNELS.has(selectedId)
									? t(`channels.status.${selectedStatus}`)
									: t('settings.channels.runtimeUnavailable')
							}
							actions={
								<div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
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
								</div>
							}
						/>
					</SettingsPanel>
				</SettingsSection>
			</div>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}
		</SettingsPageShell>
	);
};

function ListEditor({
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
			<InputGroup className="h-7">
				<InputGroupInput
					value={value}
					onChange={(event) => onDraftChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							onAdd();
						}
					}}
					placeholder={placeholder}
					className="h-7 min-w-0 px-2 text-xs md:text-xs"
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

function getDefaultAccountConfig(
	channelId: ChannelType,
	config: EditableChannelConfig
): ChannelAccountProperties {
	if (channelId === 'telegram') {
		const telegram = config as TelegramChannelProperties;
		const account = telegram.accounts?.[telegram.defaultAccountId ?? 'default'];
		return {
			...account,
			label: account?.label ?? 'Telegram bot',
			enabled: telegram.enabled ?? account?.enabled ?? false,
			token: account?.token ?? telegram.token,
			defaultTarget: account?.defaultTarget ?? telegram.defaultTarget,
			allowFrom: account?.allowFrom ?? telegram.allowFrom,
			groupAllowFrom: account?.groupAllowFrom ?? telegram.groupAllowFrom ?? [],
			dmPolicy: account?.dmPolicy ?? telegram.dmPolicy ?? 'allowlist',
		};
	}
	if (channelId === 'discord') {
		const discord = config as DiscordChannelProperties;
		const account = discord.accounts?.[discord.defaultAccountId ?? 'default'];
		return {
			...account,
			label: account?.label ?? 'Discord bot',
			enabled: discord.enabled ?? account?.enabled ?? false,
			token: account?.token ?? discord.token,
			defaultTarget: account?.defaultTarget ?? discord.defaultTarget,
			allowFrom: account?.allowFrom ?? discord.allowFrom,
			groupAllowFrom: account?.groupAllowFrom ?? discord.groupAllowFrom ?? [],
			dmPolicy: account?.dmPolicy ?? discord.dmPolicy ?? 'allowlist',
		};
	}
	if (channelId === 'whatsapp') {
		const whatsapp = config as WhatsappChannelProperties;
		const account = whatsapp.accounts?.[whatsapp.defaultAccountId ?? 'default'];
		return {
			...account,
			label: account?.label ?? 'WhatsApp account',
			enabled: whatsapp.enabled ?? account?.enabled ?? false,
			token: account?.token ?? whatsapp.token,
			phoneNumber: account?.phoneNumber ?? whatsapp.phoneNumber,
			defaultTarget: account?.defaultTarget ?? whatsapp.defaultTarget,
			allowFrom: account?.allowFrom ?? whatsapp.allowFrom ?? [],
			groupAllowFrom: account?.groupAllowFrom ?? whatsapp.groupAllowFrom ?? [],
			dmPolicy: account?.dmPolicy ?? whatsapp.dmPolicy ?? 'allowlist',
		};
	}

	const generic = config as GenericChannelProperties;
	return generic.accounts?.[generic.defaultAccountId ?? 'default'] ?? emptyAccountConfig(channelId);
}

function updateDefaultAccountConfig(
	channelId: ChannelType,
	config: EditableChannelConfig,
	patch: Partial<ChannelAccountProperties>
): EditableChannelConfig {
	const current = getDefaultAccountConfig(channelId, config);
	const nextAccount = { ...current, ...patch };

	if (channelId === 'telegram') {
		const telegram = config as TelegramChannelProperties;
		return {
			...telegram,
			token: nextAccount.token ?? '',
			defaultTarget: nextAccount.defaultTarget,
			allowFrom: normalizeList(nextAccount.allowFrom ?? []),
			groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
			dmPolicy: nextAccount.dmPolicy,
			accounts: {
				...(telegram.accounts ?? {}),
				default: nextAccount,
			},
		};
	}
	if (channelId === 'discord') {
		const discord = config as DiscordChannelProperties;
		return {
			...discord,
			token: nextAccount.token ?? '',
			defaultTarget: nextAccount.defaultTarget,
			allowFrom: normalizeList(nextAccount.allowFrom ?? []),
			groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
			dmPolicy: nextAccount.dmPolicy,
			accounts: {
				...(discord.accounts ?? {}),
				default: nextAccount,
			},
		};
	}
	if (channelId === 'whatsapp') {
		const whatsapp = config as WhatsappChannelProperties;
		return {
			...whatsapp,
			token: nextAccount.token ?? '',
			phoneNumber: nextAccount.phoneNumber ?? '',
			defaultTarget: nextAccount.defaultTarget,
			allowFrom: normalizeList(nextAccount.allowFrom ?? []),
			groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
			dmPolicy: nextAccount.dmPolicy,
			accounts: {
				...(whatsapp.accounts ?? {}),
				default: nextAccount,
			},
		};
	}

	const generic = config as GenericChannelProperties;
	return {
		...generic,
		defaultAccountId: generic.defaultAccountId ?? 'default',
		accounts: {
			...(generic.accounts ?? {}),
			default: nextAccount,
		},
	};
}

function updateChannelEnabled(
	channelId: ChannelType,
	config: EditableChannelConfig,
	enabled: boolean
): EditableChannelConfig {
	const nextConfig = { ...(config as GenericChannelProperties), enabled };
	return updateDefaultAccountConfig(channelId, nextConfig, { enabled });
}

function isChannelEnabled(channelId: ChannelType, config: EditableChannelConfig | null): boolean {
	if (!config) return false;
	return Boolean((config as GenericChannelProperties).enabled ?? getDefaultAccountConfig(channelId, config).enabled);
}

function isAccountConfigured(account: ChannelAccountProperties): boolean {
	return Boolean(
		account.token?.trim() ||
			account.webhookUrl?.trim() ||
			account.serverUrl?.trim() ||
			account.phoneNumber?.trim()
	);
}

function emptyAccountConfig(channelId: ChannelType): ChannelAccountProperties {
	return {
		label: `${channelId} default`,
		enabled: false,
		token: '',
		serverUrl: '',
		webhookUrl: '',
		defaultTarget: '',
		allowFrom: [],
		groupAllowFrom: [],
		dmPolicy: 'allowlist',
	};
}

function normalizeList(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getTokenPlaceholder(channelId: ChannelType, t: (key: string) => string): string {
	if (channelId === 'telegram') return t('settings.channels.telegramTokenPlaceholder');
	if (channelId === 'discord') return t('settings.channels.discordTokenPlaceholder');
	return t('settings.channels.tokenPlaceholder');
}

export default ChannelsPage;
