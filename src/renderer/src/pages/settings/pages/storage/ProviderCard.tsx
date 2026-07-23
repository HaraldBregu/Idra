import React, { useEffect, useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	DownloadCloud,
	Pencil,
	Trash2,
	UploadCloud,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { StorageConfig, StorageSyncFolder } from '../../../../../../shared/storage_types';
import { getErrorMessage } from '../../../start/constants';
import { SettingsField, SettingsNotice } from '../../components';
import { SYNC_INTERVAL_OPTIONS } from './constants';

type StringConfigKey =
	| 'name'
	| 'endpoint'
	| 'region'
	| 'bucket'
	| 'accessKeyId'
	| 'secretAccessKey';

interface FieldDef {
	key: StringConfigKey;
	labelKey: string;
	type?: 'password';
	placeholder?: string;
}

const CONNECTION_FIELDS: readonly FieldDef[] = [
	{
		key: 'endpoint',
		labelKey: 'settings.storage.endpoint',
		placeholder: 'https://s3.amazonaws.com',
	},
	{ key: 'region', labelKey: 'settings.storage.region', placeholder: 'us-east-1' },
	{ key: 'bucket', labelKey: 'settings.storage.bucket' },
];

const CREDENTIAL_FIELDS: readonly FieldDef[] = [
	{ key: 'accessKeyId', labelKey: 'settings.storage.accessKeyId' },
	{ key: 'secretAccessKey', labelKey: 'settings.storage.secretAccessKey', type: 'password' },
];

const isConfigured = (config: StorageConfig): boolean =>
	Boolean(config.bucket && config.accessKeyId && config.secretAccessKey);

const mask = (value: string): string =>
	value.length > 4 ? `••••${value.slice(-4)}` : '•'.repeat(value.length);

function GroupHeading({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
	return (
		<h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
			{children}
		</h3>
	);
}

interface ProviderCardProps {
	readonly storage: StorageConfig;
	readonly onSaved: (saved: StorageConfig) => void;
	readonly onRemoved: () => void;
}

export function ProviderCard({
	storage,
	onSaved,
	onRemoved,
}: ProviderCardProps): React.JSX.Element {
	const { t } = useTranslation();
	const [instanceId] = useState(() => storage.id || crypto.randomUUID());
	const [canonical, setCanonical] = useState(storage);
	const [draft, setDraft] = useState(storage);
	const [editing, setEditing] = useState(!storage.id);
	const [expanded, setExpanded] = useState(true);
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [pushing, setPushing] = useState(false);
	const [pulling, setPulling] = useState(false);
	const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [syncFolders, setSyncFolders] = useState<StorageSyncFolder[]>([]);

	useEffect(() => {
		void window.storage.syncFolders().then(setSyncFolders, () => {});
	}, []);

	const update = (
		key: StringConfigKey | 'forcePathStyle' | 'syncIntervalMinutes',
		value: string | boolean | number
	): void => {
		setDraft((current) => ({ ...current, [key]: value }));
		setStatus(null);
	};

	const startEditing = (): void => {
		setDraft(canonical);
		setEditing(true);
		setExpanded(true);
		setStatus(null);
		setError(null);
	};

	const cancelEditing = (): void => {
		if (!canonical.id) {
			onRemoved();
			return;
		}
		setDraft(canonical);
		setEditing(false);
		setStatus(null);
		setError(null);
	};

	const save = async (target: StorageConfig = draft): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const saved = await window.storage.saveStorageConfig(target);
			setCanonical(saved);
			setDraft(saved);
			setEditing(false);
			setStatus({ ok: true, message: t('settings.storage.saved') });
			onSaved(saved);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.save')));
		} finally {
			setSaving(false);
		}
	};

	const remove = async (): Promise<void> => {
		if (!canonical.id) {
			onRemoved();
			return;
		}
		setRemoving(true);
		setError(null);
		try {
			await window.storage.deleteStorageConfig(canonical.id);
			onRemoved();
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.delete')));
			setRemoving(false);
		}
	};

	const test = async (): Promise<void> => {
		const target = editing ? draft : canonical;
		setTesting(true);
		setStatus(null);
		const result = await window.storage.testConnection(target);
		setStatus({
			ok: result.ok,
			message: result.ok
				? t('settings.storage.testOk')
				: (result.error ?? t('settings.storage.errors.test')),
		});
		setTesting(false);
	};

	const toggleSyncFolder = (folderPath: string, enabled: boolean): void => {
		const base = editing ? draft : canonical;
		const paths = enabled
			? Array.from(new Set([...base.paths, folderPath]))
			: base.paths.filter((path) => path !== folderPath);
		if (editing) {
			setDraft((current) => ({ ...current, paths }));
			setStatus(null);
		} else {
			void save({ ...canonical, paths });
		}
	};

	const push = async (): Promise<void> => {
		setPushing(true);
		setStatus(null);
		setError(null);
		try {
			const result = await window.storage.push(canonical.id);
			const failedCount = result.failed.length;
			setStatus({
				ok: failedCount === 0,
				message:
					failedCount === 0
						? t('settings.storage.pushOk', { count: result.uploaded.length })
						: t('settings.storage.pushPartial', {
								uploaded: result.uploaded.length,
								failed: failedCount,
							}),
			});
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.push')));
		} finally {
			setPushing(false);
		}
	};

	const pull = async (): Promise<void> => {
		setPulling(true);
		setStatus(null);
		setError(null);
		try {
			const result = await window.storage.pull(canonical.id);
			const failedCount = result.failed.length;
			setStatus({
				ok: failedCount === 0,
				message:
					failedCount === 0
						? t('settings.storage.pullOk', { count: result.downloaded.length })
						: t('settings.storage.pullPartial', {
								downloaded: result.downloaded.length,
								failed: failedCount,
							}),
			});
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.pull')));
		} finally {
			setPulling(false);
		}
	};

	const renderField = (field: FieldDef, value: string): React.JSX.Element => (
		<SettingsField
			key={field.key}
			id={`storage-${instanceId}-${field.key}`}
			label={t(field.labelKey)}
		>
			<Input
				id={`storage-${instanceId}-${field.key}`}
				type={field.type ?? 'text'}
				value={value}
				placeholder={field.placeholder}
				autoComplete="off"
				onChange={(event) => update(field.key, event.target.value)}
			/>
		</SettingsField>
	);

	const viewRows: readonly { labelKey: string; value: string }[] = [
		{
			labelKey: 'settings.storage.endpoint',
			value: canonical.endpoint || t('settings.storage.endpointDefault'),
		},
		{ labelKey: 'settings.storage.region', value: canonical.region },
		{ labelKey: 'settings.storage.bucket', value: canonical.bucket },
		{ labelKey: 'settings.storage.accessKeyId', value: mask(canonical.accessKeyId) },
		{ labelKey: 'settings.storage.secretAccessKey', value: mask(canonical.secretAccessKey) },
	];

	return (
		<Card size="sm">
			<Collapsible open={expanded} onOpenChange={setExpanded} className="flex flex-col gap-3">
				<CardHeader
					className={cn('cursor-pointer select-none', expanded && 'border-b')}
					onClick={() => setExpanded((value) => !value)}
				>
					<CardTitle>
						{editing ? (
							<Input
								value={draft.name}
								placeholder={t('settings.storage.namePlaceholder')}
								onChange={(event) => update('name', event.target.value)}
								onClick={(event) => event.stopPropagation()}
								className="h-7 max-w-64 text-sm font-semibold"
								aria-label={t('settings.storage.name')}
							/>
						) : (
							canonical.name || t('settings.storage.newProviderTitle')
						)}
					</CardTitle>
					<CardAction
						className="flex items-center gap-2"
						onClick={(event) => event.stopPropagation()}
					>
						{!editing && isConfigured(canonical) && (
							<Badge variant="secondary" className="gap-1 text-[10px]">
								<CheckCircle2 className="size-3" />
							</Badge>
						)}
						<CollapsibleTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={
										expanded ? t('settings.storage.collapse') : t('settings.storage.expand')
									}
								>
									<ChevronDown
										className={cn('size-3 transition-transform', expanded && 'rotate-180')}
									/>
								</Button>
							}
						/>
						{!editing && (
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={t('settings.storage.edit')}
								onClick={startEditing}
							>
								<Pencil className="size-3" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={t('settings.storage.removeProvider')}
							onClick={() => void remove()}
							disabled={removing || saving}
						>
							<Trash2 className="size-3" />
						</Button>
					</CardAction>
				</CardHeader>

				<CollapsibleContent className="flex flex-col gap-3">
					<CardContent className="space-y-4">
						{error && (
							<SettingsNotice variant="destructive" icon={AlertTriangle}>
								{error}
							</SettingsNotice>
						)}
						{status && (
							<SettingsNotice
								variant={status.ok ? 'default' : 'destructive'}
								icon={status.ok ? CheckCircle2 : AlertTriangle}
							>
								{status.message}
							</SettingsNotice>
						)}

						{editing ? (
							<div className="space-y-5">
								<section className="space-y-3">
									<GroupHeading>{t('settings.storage.connectionTitle')}</GroupHeading>
									{renderField(CONNECTION_FIELDS[0], draft.endpoint)}
									<div className="grid gap-3 sm:grid-cols-2">
										{renderField(CONNECTION_FIELDS[1], draft.region)}
										{renderField(CONNECTION_FIELDS[2], draft.bucket)}
									</div>
								</section>

								<section className="space-y-3">
									<GroupHeading>{t('settings.storage.credentialsTitle')}</GroupHeading>
									{CREDENTIAL_FIELDS.map((field) => renderField(field, draft[field.key]))}
								</section>

								<section className="space-y-2">
									<GroupHeading>{t('settings.storage.optionsTitle')}</GroupHeading>
									<div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
										<div className="min-w-0">
											<div className="text-[13px] font-medium leading-4 text-foreground">
												{t('settings.storage.forcePathStyle')}
											</div>
											<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
												{t('settings.storage.forcePathStyleDescription')}
											</p>
										</div>
										<Switch
											checked={draft.forcePathStyle}
											onCheckedChange={(checked) => update('forcePathStyle', checked)}
										/>
									</div>
									<div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
										<div className="min-w-0">
											<div className="text-[13px] font-medium leading-4 text-foreground">
												{t('settings.storage.autoSync.interval')}
											</div>
											<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
												{t('settings.storage.autoSync.description')}
											</p>
										</div>
										<Select
											value={String(draft.syncIntervalMinutes)}
											onValueChange={(value) => update('syncIntervalMinutes', Number(value))}
										>
											<SelectTrigger
												id={`storage-${instanceId}-sync-interval`}
												className="h-7 w-44 text-xs"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{SYNC_INTERVAL_OPTIONS.map((option) => (
													<SelectItem key={option.minutes} value={String(option.minutes)}>
														{t(option.labelKey)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</section>

							</div>
						) : (
							<div className="space-y-5">
								<dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
									{viewRows.map((row) => (
										<div key={row.labelKey} className="flex min-w-0 flex-col gap-1">
											<dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
												{t(row.labelKey)}
											</dt>
											<dd className="truncate font-mono text-xs text-foreground">{row.value}</dd>
										</div>
									))}
									<div className="flex min-w-0 flex-col gap-1">
										<dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
											{t('settings.storage.forcePathStyle')}
										</dt>
										<dd>
											<Badge variant="secondary" className="text-[10px]">
												{t(
													canonical.forcePathStyle
														? 'settings.storage.enabled'
														: 'settings.storage.disabled'
												)}
											</Badge>
										</dd>
									</div>
									<div className="flex min-w-0 flex-col gap-1">
										<dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
											{t('settings.storage.autoSync.interval')}
										</dt>
										<dd className="truncate font-mono text-xs text-foreground">
											{t(
												SYNC_INTERVAL_OPTIONS.find(
													(option) => option.minutes === canonical.syncIntervalMinutes
												)?.labelKey ?? 'settings.storage.autoSync.off'
											)}
										</dd>
									</div>
								</dl>

							</div>
						)}

						<section className="space-y-2">
							<GroupHeading>{t('settings.storage.pathsTitle')}</GroupHeading>
							<div className="space-y-1.5">
								{syncFolders.map((folder) => {
									const active = (editing ? draft : canonical).paths.includes(folder.path);
									return (
										<Item key={folder.key} variant="outline" size="sm" className="px-0">
											<ItemContent className="min-w-0 flex-1">
												<ItemTitle>{t(`settings.storage.folders.${folder.key}`)}</ItemTitle>
											</ItemContent>
											<ItemActions className="ml-auto flex-none">
												<Switch
													checked={active}
													onCheckedChange={(checked) => toggleSyncFolder(folder.path, checked)}
													disabled={saving}
													aria-label={t(`settings.storage.folders.${folder.key}`)}
												/>
											</ItemActions>
										</Item>
									);
								})}
							</div>
						</section>
					</CardContent>

					{(editing || isConfigured(canonical)) && (
						<CardFooter className="justify-between gap-2">
							<div className="flex gap-2">
								{!editing && isConfigured(canonical) && (
									<>
										<Button
											variant="outline"
											size="icon-sm"
											aria-label={t('settings.storage.push')}
											onClick={() => void push()}
											disabled={pushing || pulling || canonical.paths.length === 0}
										>
											<UploadCloud className="size-3" />
										</Button>
										<Button
											variant="outline"
											size="icon-sm"
											aria-label={t('settings.storage.pull')}
											onClick={() => void pull()}
											disabled={pulling || pushing || canonical.paths.length === 0}
										>
											<DownloadCloud className="size-3" />
										</Button>
									</>
								)}
							</div>
							<div className="flex gap-2">
								{editing && (
									<>
										{canonical.id && (
											<Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
												{t('settings.storage.cancel')}
											</Button>
										)}
										<Button size="sm" onClick={() => void save()} disabled={saving}>
											{saving ? t('settings.storage.saving') : t('settings.storage.save')}
										</Button>
									</>
								)}
							</div>
						</CardFooter>
					)}
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}
