import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Hash, KeyRound, Mic, Plus, ShieldCheck, UserRound, Volume2, X } from 'lucide-react';
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
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../../components';
import type { CatalogService, PublicProvider } from '@shared/provider_types';
import { CHANNEL_DM_POLICIES } from '@shared/channels_types';
import type { ChannelDmPolicy, StoredBotProvider } from '@shared/channels_types';
import { providerIdsFor, providerModels, providers, supportsSpeechToTextApiType } from '@/lib/providers';

const MODEL_SELECTION_VALUE_SEPARATOR = '\u001F';

interface ModelChoice {
	readonly id: string;
	readonly name: string;
}

interface ChannelModelGroup {
	readonly provider: PublicProvider;
	readonly models: readonly ModelChoice[];
}

type ListField = 'allowFrom' | 'groupAllowFrom';

const SETTINGS_INPUT_CLASS = 'h-8 w-full text-xs sm:w-80';

const ChannelDetailPage: React.FC = () => {
	const { t } = useTranslation();
	const { channelId } = useParams<{ channelId: string }>();
	const providerId = channelId ?? '';
	const [service, setService] = useState<CatalogService | null>(null);
	const [credential, setCredential] = useState<StoredBotProvider | null>(null);
	const [listDrafts, setListDrafts] = useState<Record<ListField, string>>({
		allowFrom: '',
		groupAllowFrom: '',
	});
	const [error, setError] = useState<string | null>(null);
	const sttGroups = getSttModelGroups();
	const ttsGroups = getTtsModelGroups();
	const selectedSttModel = getSelectedModel(sttGroups, credential?.sttProviderId, credential?.sttModelId);
	const selectedTtsModel = getSelectedModel(ttsGroups, credential?.ttsProviderId, credential?.ttsModelId);

	useEffect(() => {
		let mounted = true;

		void Promise.all([window.app.channels(), window.provider.get(providerId)])
			.then(([services, stored]) => {
				if (!mounted) return;
				const entry = services.find((item) => item.provider.id === providerId) ?? null;
				setService(entry);
				setCredential(stored ?? blankCredential(providerId, entry));
			})
			.catch((err) => {
				console.error('[ChannelDetailPage] Failed to load channel:', err);
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			});

		return () => {
			mounted = false;
		};
	}, [providerId]);

	const save = async (next: StoredBotProvider): Promise<void> => {
		setCredential(next);
		setError(null);
		try {
			await window.provider.set(next, 'bots');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const addListValue = (field: ListField): void => {
		const value = listDrafts[field].trim();
		if (!value || !credential) return;
		setListDrafts((current) => ({ ...current, [field]: '' }));
		void save({
			...credential,
			[field]: [...new Set([...(credential[field] ?? []), value])],
		});
	};

	const removeListValue = (field: ListField, value: string): void => {
		if (!credential) return;
		void save({
			...credential,
			[field]: (credential[field] ?? []).filter((item) => item !== value),
		});
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={service?.provider.name ?? t('settings.channels.configuration')}
				description={service?.name}
			/>

			{error && <SettingsNotice variant="destructive">{error}</SettingsNotice>}

			{credential ? (
				<Card size="sm" className="gap-0! p-0!">
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
								id={`${providerId}-token`}
								type="password"
								autoComplete="off"
								value={credential.apiKey}
								onChange={(event) =>
									setCredential({ ...credential, apiKey: event.target.value })
								}
								onBlur={() => void save(credential)}
								placeholder={t('settings.channels.tokenPlaceholder')}
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
								value={credential.dmPolicy ?? 'allowlist'}
								onValueChange={(value: string | null) => {
									if (value !== null) void save({ ...credential, dmPolicy: value as ChannelDmPolicy });
								}}
							>
								<SelectTrigger id={`${providerId}-dm-policy`} className="w-full text-xs">
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

					<Item
						variant="outline"
						size="md"
						className="flex-col items-stretch gap-3 border-b border-border/60"
					>
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
							id={`${providerId}-allow-from`}
							value={listDrafts.allowFrom}
							items={credential.allowFrom ?? []}
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
							id={`${providerId}-group-allow-from`}
							value={listDrafts.groupAllowFrom}
							items={credential.groupAllowFrom ?? []}
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
						<Item
							variant="outline"
							size="md"
							className="flex-col items-stretch gap-3 border-b border-border/60"
						>
							<div className="flex w-full min-w-0 items-start gap-3">
								<ItemMedia variant="icon">
									<Mic className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<div className="min-w-0 flex-1">
									<ItemTitle className="w-full">{t('settings.channels.sttModel')}</ItemTitle>
									<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
										{t('settings.channels.sttModelDescription')}
									</p>
								</div>
							</div>
							<div className="w-full min-w-0">
								<Select
									value={selectionValue(selectedSttModel)}
									onValueChange={(value) => {
										if (!value) return;
										const [nextProviderId = '', nextModelId = ''] = value.split(
											MODEL_SELECTION_VALUE_SEPARATOR
										);
										if (!nextProviderId || !nextModelId || !credential) return;
										void save({
											...credential,
											sttProviderId: nextProviderId,
											sttModelId: nextModelId,
										});
									}}
									disabled={sttGroups.length === 0}
								>
									<SelectTrigger className="w-full text-xs sm:w-80">
										<SelectValue placeholder={t('settings.modelServices.modelPlaceholder')} />
									</SelectTrigger>
									<SelectContent>
										{sttGroups.flatMap((group) =>
											group.models.map((model) => (
												<SelectItem
													key={`${group.provider.id}${MODEL_SELECTION_VALUE_SEPARATOR}${model.id}`}
													value={`${group.provider.id}${MODEL_SELECTION_VALUE_SEPARATOR}${model.id}`}
												>
													{formatModelSelection(group.provider, model)}
												</SelectItem>
											))
										)}
									</SelectContent>
								</Select>
								{sttGroups.length === 0 && (
									<p className="mt-1 text-[11px] leading-4 text-muted-foreground">
										{t('settings.channels.noModelOptions')}
									</p>
								)}
							</div>
						</Item>
						<Item variant="outline" size="md" className="flex-col items-stretch gap-3">
							<div className="flex w-full min-w-0 items-start gap-3">
								<ItemMedia variant="icon">
									<Volume2 className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<div className="min-w-0 flex-1">
									<ItemTitle className="w-full">{t('settings.channels.ttsModel')}</ItemTitle>
									<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
										{t('settings.channels.ttsModelDescription')}
									</p>
								</div>
							</div>
							<div className="w-full min-w-0">
								<Select
									value={selectionValue(selectedTtsModel)}
									onValueChange={(value) => {
										if (!value) return;
										const [nextProviderId = '', nextModelId = ''] = value.split(
											MODEL_SELECTION_VALUE_SEPARATOR
										);
										if (!nextProviderId || !nextModelId || !credential) return;
										void save({
											...credential,
											ttsProviderId: nextProviderId,
											ttsModelId: nextModelId,
										});
									}}
									disabled={ttsGroups.length === 0}
								>
									<SelectTrigger className="w-full text-xs sm:w-80">
										<SelectValue placeholder={t('settings.modelServices.modelPlaceholder')} />
									</SelectTrigger>
									<SelectContent>
										{ttsGroups.flatMap((group) =>
											group.models.map((model) => (
												<SelectItem
													key={`${group.provider.id}${MODEL_SELECTION_VALUE_SEPARATOR}${model.id}`}
													value={`${group.provider.id}${MODEL_SELECTION_VALUE_SEPARATOR}${model.id}`}
												>
													{formatModelSelection(group.provider, model)}
												</SelectItem>
											))
										)}
									</SelectContent>
								</Select>
								{ttsGroups.length === 0 && (
									<p className="mt-1 text-[11px] leading-4 text-muted-foreground">
										{t('settings.channels.noModelOptions')}
									</p>
								)}
							</div>
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

function blankCredential(
	providerId: string,
	service: CatalogService | null
): StoredBotProvider {
	return {
		id: providerId,
		name: service?.provider.name ?? providerId,
		apiKey: '',
		baseUrl: service?.url ?? '',
		allowFrom: [],
		groupAllowFrom: [],
		dmPolicy: 'allowlist',
	};
}

export default ChannelDetailPage;
