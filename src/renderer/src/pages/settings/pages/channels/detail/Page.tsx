import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
	CircleOff,
	ExternalLink,
	Hash,
	KeyRound,
	Link2,
	Phone,
	Plus,
	RadioTower,
	Server,
	ShieldCheck,
	type LucideIcon,
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
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';
import { openExternalUrl } from '@/lib/external-links';
import type {
	Channel,
	ChannelAccountProperties,
	ChannelConnectionStatus,
	ChannelDmPolicy,
	ChannelHeartbeatVisibilityConfig,
	ChannelSetupField,
	ChannelType,
	DiscordChannelProperties,
	GenericChannelProperties,
	TelegramChannelProperties,
	WhatsappChannelProperties,
} from '../../../../../../../shared/channels';
import {
	CHANNEL_DEFAULT_ACCOUNT_ID,
	CHANNEL_DEFAULT_DM_POLICY,
	CHANNEL_DM_POLICIES,
	buildChannelDocsUrl,
	isChannelId,
	type ChannelCatalogEntry,
} from '../../../../../../../shared/channels';
import { ChannelIcon } from '../ChannelIcon';

type EditableChannelConfig = Channel[ChannelType];
type ListField = 'allowFrom' | 'groupAllowFrom';
type TextSetupField = Extract<
	ChannelSetupField,
	| 'token'
	| 'secret'
	| 'serverUrl'
	| 'webhookUrl'
	| 'appId'
	| 'clientId'
	| 'clientSecret'
	| 'username'
	| 'phoneNumber'
	| 'botUserId'
	| 'defaultTarget'
>;

const TEXT_SETUP_FIELD_CONFIG: Record<
	TextSetupField,
	{
		readonly labelKey: string;
		readonly placeholderKey: string;
		readonly icon: LucideIcon;
		readonly inputType?: React.HTMLInputTypeAttribute;
	}
> = {
	token: {
		labelKey: 'settings.channels.token',
		placeholderKey: 'settings.channels.tokenPlaceholder',
		icon: KeyRound,
		inputType: 'password',
	},
	secret: {
		labelKey: 'settings.channels.secret',
		placeholderKey: 'settings.channels.secretPlaceholder',
		icon: KeyRound,
		inputType: 'password',
	},
	serverUrl: {
		labelKey: 'settings.channels.serverUrl',
		placeholderKey: 'settings.channels.serverUrlPlaceholder',
		icon: Server,
	},
	webhookUrl: {
		labelKey: 'settings.channels.webhookUrl',
		placeholderKey: 'settings.channels.webhookUrlPlaceholder',
		icon: Link2,
	},
	appId: {
		labelKey: 'settings.channels.appId',
		placeholderKey: 'settings.channels.appIdPlaceholder',
		icon: Hash,
	},
	clientId: {
		labelKey: 'settings.channels.clientId',
		placeholderKey: 'settings.channels.clientIdPlaceholder',
		icon: Hash,
	},
	clientSecret: {
		labelKey: 'settings.channels.clientSecret',
		placeholderKey: 'settings.channels.clientSecretPlaceholder',
		icon: KeyRound,
		inputType: 'password',
	},
	username: {
		labelKey: 'settings.channels.username',
		placeholderKey: 'settings.channels.usernamePlaceholder',
		icon: UserRound,
	},
	phoneNumber: {
		labelKey: 'settings.channels.phoneNumber',
		placeholderKey: 'settings.channels.phoneNumberPlaceholder',
		icon: Phone,
		inputType: 'tel',
	},
	botUserId: {
		labelKey: 'settings.channels.botUserId',
		placeholderKey: 'settings.channels.botUserIdPlaceholder',
		icon: UserRound,
	},
	defaultTarget: {
		labelKey: 'settings.channels.defaultTarget',
		placeholderKey: 'settings.channels.defaultTargetPlaceholder',
		icon: Hash,
	},
};

const HEARTBEAT_FIELDS: readonly {
	readonly field: keyof ChannelHeartbeatVisibilityConfig;
	readonly labelKey: string;
}[] = [
	{ field: 'showOk', labelKey: 'settings.channels.heartbeatShowOk' },
	{ field: 'showAlerts', labelKey: 'settings.channels.heartbeatShowAlerts' },
	{ field: 'useIndicator', labelKey: 'settings.channels.heartbeatUseIndicator' },
];

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
	const [catalog, setCatalog] = useState<readonly ChannelCatalogEntry[]>([]);
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

	const selectedEntry = selectedId ? catalog.find((entry) => entry.id === selectedId) : null;
	const selectedConfig = selectedId ? configs?.[selectedId] ?? null : null;
	const selectedAccount = selectedConfig && selectedId
		? getDefaultAccountConfig(selectedId, selectedConfig)
		: emptyAccountConfig(selectedId ?? 'telegram');
	const selectedStatus = selectedId ? statusByChannel[selectedId] ?? 'disconnected' : 'disconnected';
	const selectedTitle = selectedEntry?.label ?? t('settings.channels.configuration');
	const selectedDocsUrl = selectedEntry ? buildChannelDocsUrl(selectedEntry.docsPath, __APP_HOMEPAGE__) : null;
	const selectedSetupFields = selectedEntry?.setupFields ?? [];

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

	const renderTextSetupField = (field: TextSetupField): React.JSX.Element => {
		const config = TEXT_SETUP_FIELD_CONFIG[field];
		const Icon = config.icon;
		const label = t(config.labelKey);
		const placeholder =
			field === 'token' && selectedId ? getTokenPlaceholder(selectedId, t) : t(config.placeholderKey);

		return (
			<Item key={field} variant="outline" size="md" className="border-b border-border/60">
				<ItemMedia variant="icon">
					<Icon className="size-3" strokeWidth={1.8} />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>{label}</ItemTitle>
				</ItemContent>
				<ItemActions className="ml-auto flex-none justify-end">
					<Input
						type={config.inputType}
						value={getAccountStringValue(selectedAccount, field)}
						onChange={(event) => updateAccountField(field, event.target.value)}
						onBlur={() => void saveSelectedConfig()}
						placeholder={placeholder}
						className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
						aria-label={label}
					/>
				</ItemActions>
			</Item>
		);
	};

	const renderListSetupField = (field: ListField): React.JSX.Element => {
		const config =
			field === 'allowFrom'
				? {
						icon: UserRound,
						label: t('settings.channels.allowFrom'),
						placeholder: t('settings.channels.allowFromPlaceholder'),
						addLabel: t('settings.channels.addAllowFrom'),
						removeLabel: (item: string) => t('settings.channels.removeAllowFrom', { value: item }),
						emptyLabel: t('settings.channels.noAllowFrom'),
					}
				: {
						icon: Hash,
						label: t('settings.channels.groupAllowFrom'),
						placeholder: t('settings.channels.groupAllowFromPlaceholder'),
						addLabel: t('settings.channels.addGroupAllowFrom'),
						removeLabel: (item: string) =>
							t('settings.channels.removeGroupAllowFrom', { value: item }),
						emptyLabel: t('settings.channels.noGroupAllowFrom'),
					};
		const Icon = config.icon;

		return (
			<Item
				key={field}
				variant="outline"
				size="md"
				className="border-b border-border/60 flex-wrap"
			>
				<ItemMedia variant="icon">
					<Icon className="size-3" strokeWidth={1.8} />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>{config.label}</ItemTitle>
				</ItemContent>
				<ItemActions className="ml-auto w-full justify-end sm:w-[26rem] sm:flex-none">
					<ListEditor
						value={listDrafts[field]}
						items={selectedAccount[field] ?? []}
						placeholder={config.placeholder}
						addLabel={config.addLabel}
						removeLabel={config.removeLabel}
						emptyLabel={config.emptyLabel}
						onDraftChange={(value) =>
							setListDrafts((current) => ({ ...current, [field]: value }))
						}
						onAdd={() => addListValue(field)}
						onRemove={(value) => removeListValue(field, value)}
					/>
				</ItemActions>
			</Item>
		);
	};

	const renderDmPolicyField = (): React.JSX.Element => (
		<Item key="dmPolicy" variant="outline" size="md" className="border-b border-border/60">
			<ItemMedia variant="icon">
				<ShieldCheck className="size-3" strokeWidth={1.8} />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>{t('settings.channels.dmPolicy')}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
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
						{CHANNEL_DM_POLICIES.map((policy) => (
							<SelectItem key={policy} value={policy}>
								{t(`settings.channels.dmPolicies.${policy}`)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</ItemActions>
		</Item>
	);

	const renderHeartbeatField = (): React.JSX.Element => (
		<Item
			key="heartbeat"
			variant="outline"
			size="md"
			className="border-b border-border/60 flex-wrap"
		>
			<ItemMedia variant="icon">
				<RadioTower className="size-3" strokeWidth={1.8} />
			</ItemMedia>
			<ItemContent>
				<ItemTitle>{t('settings.channels.heartbeat')}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto w-full justify-end sm:w-80 sm:flex-none">
				<HeartbeatEditor
					value={selectedAccount.heartbeat}
					onChange={(heartbeat) => updateAccountField('heartbeat', heartbeat, { save: true })}
					t={t}
				/>
			</ItemActions>
		</Item>
	);

	const renderSetupField = (field: ChannelSetupField): React.JSX.Element | null => {
		if (field === 'enabled') return null;
		if (isTextSetupField(field)) return renderTextSetupField(field);
		if (field === 'allowFrom' || field === 'groupAllowFrom') return renderListSetupField(field);
		if (field === 'dmPolicy') return renderDmPolicyField();
		if (field === 'heartbeat') return renderHeartbeatField();
		return null;
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={selectedTitle}
				description={selectedEntry?.blurb}
				action={
					selectedDocsUrl && selectedEntry ? (
						<Button
							type="button"
							variant="outline"
							size="icon-xs"
							aria-label={selectedEntry.docsLabel}
							title={selectedEntry.docsLabel}
							onClick={() => openExternalUrl(selectedDocsUrl)}
						>
							<ExternalLink className="size-3" />
						</Button>
					) : undefined
				}
				iconNode={
					selectedId ? (
						<ChannelIcon
							channelId={selectedId}
							name={selectedTitle}
							brandIconId={selectedEntry?.brandIconId}
							className="size-full border-0 bg-transparent p-1"
							fallbackClassName="size-3"
						/>
					) : undefined
				}
			/>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}
			{selectedEntry && selectedEntry.runtime !== 'bundled' && (
				<SettingsNotice icon={CircleOff}>
					{t('settings.channels.runtimeUnavailable')}
				</SettingsNotice>
			)}

			{selectedId ? (
				<SettingsSection
					title={t('settings.channels.configuration')}
					action={
						<Badge
							variant={isChannelEnabled(selectedId, selectedConfig) ? 'secondary' : 'outline'}
							className="h-5 px-2 text-[10px]"
						>
							{isChannelEnabled(selectedId, selectedConfig)
								? t('settings.channels.enabled')
								: t('settings.channels.disabled')}
						</Badge>
					}
				>
					<SettingsPanel>
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemMedia variant="icon">
								<ShieldCheck className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>{t('settings.channels.enabled')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<Switch
									checked={isChannelEnabled(selectedId, selectedConfig)}
									onCheckedChange={(checked) =>
										updateSelectedConfig((config) => updateChannelEnabled(selectedId, config, checked), {
											save: true,
										})
									}
									aria-label={t('settings.channels.enabled')}
								/>
							</ItemActions>
						</Item>

						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemMedia variant="icon">
								<UserRound className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>{t('settings.channels.accountLabel')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<Input
									value={selectedAccount.label ?? ''}
									onChange={(event) => updateAccountField('label', event.target.value)}
									onBlur={() => void saveSelectedConfig()}
									placeholder={t('settings.channels.accountLabelPlaceholder')}
									className="h-7 w-full min-w-0 px-2 text-xs sm:w-80 md:text-xs"
									aria-label={t('settings.channels.accountLabel')}
								/>
							</ItemActions>
						</Item>

						{selectedSetupFields.map(renderSetupField)}

						<Item variant="outline" size="md">
							<ItemMedia variant="icon">
								<RadioTower className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>{t('settings.channels.status')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none flex-wrap justify-end gap-2">
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
							</ItemActions>
						</Item>
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

function HeartbeatEditor({
	value,
	onChange,
	t,
}: {
	readonly value: ChannelHeartbeatVisibilityConfig | undefined;
	readonly onChange: (value: ChannelHeartbeatVisibilityConfig) => void;
	readonly t: (key: string) => string;
}): React.JSX.Element {
	return (
		<div className="grid w-full min-w-0 gap-1.5">
			{HEARTBEAT_FIELDS.map(({ field, labelKey }) => {
				const label = t(labelKey);
				return (
					<div
						key={field}
						className="flex min-h-7 items-center justify-between gap-3 rounded-md border border-border/60 px-2"
					>
						<span className="min-w-0 truncate text-[11px] text-muted-foreground">{label}</span>
						<Switch
							checked={Boolean(value?.[field])}
							onCheckedChange={(checked) => onChange({ ...(value ?? {}), [field]: checked })}
							aria-label={label}
						/>
					</div>
				);
			})}
		</div>
	);
}

function isTextSetupField(field: ChannelSetupField): field is TextSetupField {
	return Object.prototype.hasOwnProperty.call(TEXT_SETUP_FIELD_CONFIG, field);
}

function getAccountStringValue(
	account: ChannelAccountProperties,
	field: TextSetupField
): string {
	const value = account[field];
	return typeof value === 'string' ? value : '';
}

function getDefaultAccountConfig(
	channelId: ChannelType,
	config: EditableChannelConfig
): ChannelAccountProperties {
	if (channelId === 'telegram') {
		const telegram = config as TelegramChannelProperties;
		const account = telegram.accounts?.[resolveDefaultAccountId(telegram)];
		return {
			...account,
			label: account?.label ?? 'Telegram bot',
			enabled: telegram.enabled ?? account?.enabled ?? false,
			token: account?.token ?? telegram.token,
			defaultTarget: account?.defaultTarget ?? telegram.defaultTarget,
			allowFrom: account?.allowFrom ?? telegram.allowFrom,
			groupAllowFrom: account?.groupAllowFrom ?? telegram.groupAllowFrom ?? [],
			dmPolicy: account?.dmPolicy ?? telegram.dmPolicy ?? CHANNEL_DEFAULT_DM_POLICY,
		};
	}
	if (channelId === 'discord') {
		const discord = config as DiscordChannelProperties;
		const account = discord.accounts?.[resolveDefaultAccountId(discord)];
		return {
			...account,
			label: account?.label ?? 'Discord bot',
			enabled: discord.enabled ?? account?.enabled ?? false,
			token: account?.token ?? discord.token,
			defaultTarget: account?.defaultTarget ?? discord.defaultTarget,
			allowFrom: account?.allowFrom ?? discord.allowFrom,
			groupAllowFrom: account?.groupAllowFrom ?? discord.groupAllowFrom ?? [],
			dmPolicy: account?.dmPolicy ?? discord.dmPolicy ?? CHANNEL_DEFAULT_DM_POLICY,
		};
	}
	if (channelId === 'whatsapp') {
		const whatsapp = config as WhatsappChannelProperties;
		const account = whatsapp.accounts?.[resolveDefaultAccountId(whatsapp)];
		return {
			...account,
			label: account?.label ?? 'WhatsApp account',
			enabled: whatsapp.enabled ?? account?.enabled ?? false,
			token: account?.token ?? whatsapp.token,
			phoneNumber: account?.phoneNumber ?? whatsapp.phoneNumber,
			defaultTarget: account?.defaultTarget ?? whatsapp.defaultTarget,
			allowFrom: account?.allowFrom ?? whatsapp.allowFrom ?? [],
			groupAllowFrom: account?.groupAllowFrom ?? whatsapp.groupAllowFrom ?? [],
			dmPolicy: account?.dmPolicy ?? whatsapp.dmPolicy ?? CHANNEL_DEFAULT_DM_POLICY,
		};
	}

	const generic = config as GenericChannelProperties;
	return generic.accounts?.[resolveDefaultAccountId(generic)] ?? emptyAccountConfig(channelId);
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
		const accountId = resolveDefaultAccountId(telegram);
		return {
			...telegram,
			token: nextAccount.token ?? '',
			defaultTarget: nextAccount.defaultTarget,
			allowFrom: normalizeList(nextAccount.allowFrom ?? []),
			groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
			dmPolicy: nextAccount.dmPolicy,
			accounts: {
				...(telegram.accounts ?? {}),
				[accountId]: nextAccount,
			},
		};
	}
	if (channelId === 'discord') {
		const discord = config as DiscordChannelProperties;
		const accountId = resolveDefaultAccountId(discord);
		return {
			...discord,
			token: nextAccount.token ?? '',
			defaultTarget: nextAccount.defaultTarget,
			allowFrom: normalizeList(nextAccount.allowFrom ?? []),
			groupAllowFrom: normalizeList(nextAccount.groupAllowFrom ?? []),
			dmPolicy: nextAccount.dmPolicy,
			accounts: {
				...(discord.accounts ?? {}),
				[accountId]: nextAccount,
			},
		};
	}
	if (channelId === 'whatsapp') {
		const whatsapp = config as WhatsappChannelProperties;
		const accountId = resolveDefaultAccountId(whatsapp);
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
				[accountId]: nextAccount,
			},
		};
	}

	const generic = config as GenericChannelProperties;
	const accountId = resolveDefaultAccountId(generic);
	return {
		...generic,
		defaultAccountId: accountId,
		accounts: {
			...(generic.accounts ?? {}),
			[accountId]: nextAccount,
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

function isChannelEnabled(channelId: ChannelType, config: EditableChannelConfig | null | undefined): boolean {
	if (!config) return false;
	return Boolean((config as GenericChannelProperties).enabled ?? getDefaultAccountConfig(channelId, config).enabled);
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
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
	};
}

function resolveDefaultAccountId(config: { readonly defaultAccountId?: string }): string {
	return config.defaultAccountId?.trim() || CHANNEL_DEFAULT_ACCOUNT_ID;
}

function normalizeList(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function getTokenPlaceholder(channelId: ChannelType, t: (key: string) => string): string {
	if (channelId === 'telegram') return t('settings.channels.telegramTokenPlaceholder');
	if (channelId === 'discord') return t('settings.channels.discordTokenPlaceholder');
	return t('settings.channels.tokenPlaceholder');
}

export default ChannelDetailPage;
