import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
	Hash,
	KeyRound,
	Plus,
	ShieldCheck,
	UserRound,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
} from '../../../components';
import type {
	Channel,
	ChannelAccountProperties,
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

const ChannelDetailPage: React.FC = () => {
	const { t } = useTranslation();
	const { channelId } = useParams<{ channelId: string }>();
	const selectedId = channelId && isChannelId(channelId) ? channelId : null;
	const [configs, setConfigs] = useState<Channel | null>(null);
	const [listDrafts, setListDrafts] = useState<Record<ListField, string>>({
		allowFrom: '',
		groupAllowFrom: '',
	});
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		window.app
			.getChannels()
			.then((nextConfig) => {
				if (!mounted) return;
				setConfigs(nextConfig);
			})
			.catch((error) => {
				console.error('[ChannelDetailPage] Failed to load channel settings:', error);
				if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
			});

		return () => {
			mounted = false;
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
		setLoadError(null);
		try {
			const saved = await window.app.saveChannelConfig(channelId, config);
			setConfigs((current) => {
				if (!current) return current;
				return { ...current, [channelId]: saved };
			});
		} catch (error) {
			setLoadError(error instanceof Error ? error.message : String(error));
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

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={selectedTitle}
				description={selectedEntry?.blurb}
			/>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}

			{selectedId ? (
					<Card size="sm" className="gap-0! p-0!">
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemMedia variant="icon">
								<ShieldCheck className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>{t('settings.channels.enabled')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<Switch
									checked={isChannelEnabled(selectedConfig)}
									onCheckedChange={(checked) =>
										updateSelectedConfig((config) => updateChannelEnabled(config, checked), {
											save: true,
										})
									}
									aria-label={t('settings.channels.enabled')}
								/>
							</ItemActions>
						</Item>

						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemMedia variant="icon">
								<KeyRound className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent className="min-w-0 flex-col items-start gap-0.5">
								<ItemTitle>{t('settings.channels.token')}</ItemTitle>
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.channels.tokenDescription')}
								</p>
							</ItemContent>
							<ItemActions className="ml-auto w-full flex-none justify-end sm:w-80">
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
							</ItemActions>
						</Item>

						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemMedia variant="icon">
								<ShieldCheck className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent className="min-w-0 flex-col items-start gap-0.5">
								<ItemTitle>{t('settings.channels.dmPolicy')}</ItemTitle>
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.channels.dmPolicyDescription')}
								</p>
							</ItemContent>
							<ItemActions className="ml-auto w-full flex-none justify-end sm:w-56">
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
							</ItemActions>
						</Item>

						<Item variant="outline" size="md" className="flex-col items-stretch gap-3 border-b border-border/60">
							<div className="flex w-full min-w-0 items-start gap-3">
								<ItemMedia variant="icon">
									<UserRound className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<div className="min-w-0 flex-1">
									<ItemTitle className="w-full">{t('settings.channels.allowFrom')}</ItemTitle>
									<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
										{t('settings.channels.allowFromDescription')}
									</p>
								</div>
							</div>
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
						</Item>

						<Item variant="outline" size="md" className="flex-col items-stretch gap-3">
							<div className="flex w-full min-w-0 items-start gap-3">
								<ItemMedia variant="icon">
									<Hash className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<div className="min-w-0 flex-1">
									<ItemTitle className="w-full">{t('settings.channels.groupAllowFrom')}</ItemTitle>
									<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
										{t('settings.channels.groupAllowFromDescription')}
									</p>
								</div>
							</div>
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
						</Item>
					</Card>
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
	const canAdd = value.trim().length > 0;

	return (
		<div className="flex w-full min-w-0 flex-col gap-2">
			<div className="flex h-8 w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-background/70 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
				<input
					id={id}
					value={value}
					onChange={(event) => onDraftChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && canAdd) {
							event.preventDefault();
							onAdd();
						}
					}}
					placeholder={placeholder}
					className="min-w-0 flex-1 border-0 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
					aria-label={placeholder}
				/>
				<div className="flex shrink-0 items-center border-l border-input px-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="size-6"
						disabled={!canAdd}
						onClick={onAdd}
						aria-label={addLabel}
						title={addLabel}
					>
						<Plus className="size-3" />
					</Button>
				</div>
			</div>

			<div className="rounded-lg border border-border/70 bg-muted/20 p-2">
				{items.length > 0 ? (
					<ul className="flex flex-col gap-1">
						{items.map((item) => (
							<li
								key={item}
								className="flex min-h-8 items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1"
							>
								<span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
									{item}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									onClick={() => onRemove(item)}
									className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
									aria-label={removeLabel(item)}
								>
									<X className="size-3" />
								</Button>
							</li>
						))}
					</ul>
				) : (
					<p className="px-1 py-3 text-center text-[11px] leading-4 text-muted-foreground">
						{emptyLabel}
					</p>
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
