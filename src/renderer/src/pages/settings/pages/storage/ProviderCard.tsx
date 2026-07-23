import React, { useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	FilePlus2,
	FolderPlus,
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
import type { StorageConfig } from '../../../../../../shared/storage_types';
import { getErrorMessage } from '../../../start/constants';
import { SettingsField, SettingsNotice } from '../../components';
import { SYNC_INTERVAL_OPTIONS } from './constants';

type StringConfigKey = 'name' | 'endpoint' | 'region' | 'bucket' | 'accessKeyId' | 'secretAccessKey';

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

export function ProviderCard({ storage, onSaved, onRemoved }: ProviderCardProps): React.JSX.Element {
	const { t } = useTranslation();
	const [instanceId] = useState(() => storage.id || crypto.randomUUID());
	const [canonical, setCanonical] = useState(storage);
	const [draft, setDraft] = useState(storage);
	const [editing, setEditing] = useState(!storage.id);
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [pushing, setPushing] = useState(false);
	const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
	const [error, setError] = useState<string | null>(null);

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

	const save = async (): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const saved = await window.storage.saveStorageConfig(draft);
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

	const addFiles = async (): Promise<void> => {
		setError(null);
		try {
			const picked = await window.storage.pickFiles();
			if (!picked) return;
			setDraft((current) => ({
				...current,
				paths: Array.from(new Set([...current.paths, ...picked])),
			}));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.pickFiles')));
		}
	};

	const addFolders = async (): Promise<void> => {
		setError(null);
		try {
			const picked = await window.storage.pickFolders();
			if (!picked) return;
			setDraft((current) => ({
				...current,
				paths: Array.from(new Set([...current.paths, ...picked])),
			}));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.pickFolders')));
		}
	};

	const removePath = (targetPath: string): void => {
		setDraft((current) => ({
			...current,
			paths: current.paths.filter((path) => path !== targetPath),
		}));
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

	const renderField = (field: FieldDef, value: string): React.JSX.Element => (
		<SettingsField key={field.key} id={`storage-${instanceId}-${field.key}`} label={t(field.labelKey)}>
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
			<CardHeader className="border-b">
				<CardTitle>
					{editing ? (
						<Input
							value={draft.name}
							placeholder={t('settings.storage.namePlaceholder')}
							onChange={(event) => update('name', event.target.value)}
							className="h-7 max-w-64 text-sm font-semibold"
							aria-label={t('settings.storage.name')}
						/>
					) : (
						canonical.name || t('settings.storage.newProviderTitle')
					)}
				</CardTitle>
				<CardDescription className="text-xs">
					{t('settings.storage.connectionDescription')}
				</CardDescription>
				<CardAction className="flex items-center gap-2">
					{!editing && isConfigured(canonical) && (
						<Badge variant="secondary" className="gap-1 text-[10px]">
							<CheckCircle2 className="size-3" />
							{t('settings.storage.enabled')}
						</Badge>
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

			<CardContent>
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
						</section>

						<section className="space-y-2">
							<GroupHeading>{t('settings.storage.pathsTitle')}</GroupHeading>
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.storage.pathsDescription')}
							</p>
							{draft.paths.length === 0 ? (
								<p className="text-xs text-muted-foreground">{t('settings.storage.noPaths')}</p>
							) : (
								<div className="space-y-1.5">
									{draft.paths.map((entryPath) => (
										<Item key={entryPath} variant="outline" size="sm">
											<ItemContent className="min-w-0 flex-1">
												<ItemTitle className="max-w-full truncate font-mono text-xs">
													{entryPath}
												</ItemTitle>
											</ItemContent>
											<ItemActions className="ml-auto flex-none">
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													aria-label={t('settings.storage.removePath')}
													onClick={() => removePath(entryPath)}
												>
													<Trash2 className="size-3" />
												</Button>
											</ItemActions>
										</Item>
									))}
								</div>
							)}
							<div className="flex gap-2">
								<Button type="button" variant="outline" size="sm" onClick={() => void addFiles()}>
									<FilePlus2 className="size-3" />
									{t('settings.storage.addFiles')}
								</Button>
								<Button type="button" variant="outline" size="sm" onClick={() => void addFolders()}>
									<FolderPlus className="size-3" />
									{t('settings.storage.addFolders')}
								</Button>
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
						</dl>

						<section className="space-y-2">
							<GroupHeading>{t('settings.storage.pathsTitle')}</GroupHeading>
							{canonical.paths.length === 0 ? (
								<p className="text-xs text-muted-foreground">{t('settings.storage.noPaths')}</p>
							) : (
								<ul className="space-y-1">
									{canonical.paths.map((entryPath) => (
										<li
											key={entryPath}
											className="truncate rounded-md border border-border/60 px-3 py-1.5 font-mono text-xs text-foreground"
											title={entryPath}
										>
											{entryPath}
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				)}
			</CardContent>

			<CardFooter className="justify-between gap-2">
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={() => void test()} disabled={testing || saving}>
						{testing ? t('settings.storage.testing') : t('settings.storage.test')}
					</Button>
					{!editing && isConfigured(canonical) && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => void push()}
							disabled={pushing || canonical.paths.length === 0}
						>
							<UploadCloud className="size-3" />
							{pushing ? t('settings.storage.pushing') : t('settings.storage.push')}
						</Button>
					)}
				</div>
				<div className="flex gap-2">
					{editing ? (
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
					) : (
						<Button size="sm" onClick={startEditing}>
							<Pencil className="size-3" />
							{t('settings.storage.edit')}
						</Button>
					)}
				</div>
			</CardFooter>
		</Card>
	);
}
