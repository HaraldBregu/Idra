import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, FilePlus2, Pencil, Trash2, UploadCloud } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import type { CloudConfig } from '../../../../../../shared/cloud_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
} from '../../components';

type StringConfigKey = 'endpoint' | 'region' | 'bucket' | 'accessKeyId' | 'secretAccessKey';

interface FieldDef {
	key: StringConfigKey;
	labelKey: string;
	type?: 'password';
	placeholder?: string;
}

const CONNECTION_FIELDS: readonly FieldDef[] = [
	{ key: 'endpoint', labelKey: 'settings.cloud.endpoint', placeholder: 'https://s3.amazonaws.com' },
	{ key: 'region', labelKey: 'settings.cloud.region', placeholder: 'us-east-1' },
	{ key: 'bucket', labelKey: 'settings.cloud.bucket' },
];

const CREDENTIAL_FIELDS: readonly FieldDef[] = [
	{ key: 'accessKeyId', labelKey: 'settings.cloud.accessKeyId' },
	{ key: 'secretAccessKey', labelKey: 'settings.cloud.secretAccessKey', type: 'password' },
];

const isConfigured = (config: CloudConfig): boolean =>
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

const CloudPage: React.FC = () => {
	const { t } = useTranslation();
	const [config, setConfig] = useState<CloudConfig | null>(null);
	const [draft, setDraft] = useState<CloudConfig | null>(null);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [pushing, setPushing] = useState(false);
	const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.cloud.getConfig().then(
			(value) => {
				if (cancelled) return;
				setConfig(value);
				setDraft(value);
				setEditing(!isConfigured(value));
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.cloud.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	const update = (key: StringConfigKey | 'forcePathStyle', value: string | boolean): void => {
		setDraft((current) => (current ? { ...current, [key]: value } : current));
		setStatus(null);
	};

	const startEditing = (): void => {
		setDraft(config);
		setEditing(true);
		setStatus(null);
		setError(null);
	};

	const cancelEditing = (): void => {
		setDraft(config);
		setEditing(false);
		setStatus(null);
		setError(null);
	};

	const save = async (): Promise<void> => {
		if (!draft) return;
		setSaving(true);
		setError(null);
		try {
			const saved = await window.cloud.saveConfig(draft);
			setConfig(saved);
			setDraft(saved);
			setEditing(false);
			setStatus({ ok: true, message: t('settings.cloud.saved') });
		} catch (err) {
			setError(getErrorMessage(err, t('settings.cloud.errors.save')));
		} finally {
			setSaving(false);
		}
	};

	const test = async (): Promise<void> => {
		const target = editing ? draft : config;
		if (!target) return;
		setTesting(true);
		setStatus(null);
		const result = await window.cloud.testConnection(target);
		setStatus({
			ok: result.ok,
			message: result.ok ? t('settings.cloud.testOk') : (result.error ?? t('settings.cloud.errors.test')),
		});
		setTesting(false);
	};

	const addFiles = async (): Promise<void> => {
		setError(null);
		try {
			const picked = await window.cloud.pickFiles();
			if (!picked) return;
			setDraft((current) =>
				current
					? { ...current, filePaths: Array.from(new Set([...current.filePaths, ...picked])) }
					: current
			);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.cloud.errors.pickFiles')));
		}
	};

	const removeFile = (filePath: string): void => {
		setDraft((current) =>
			current ? { ...current, filePaths: current.filePaths.filter((path) => path !== filePath) } : current
		);
	};

	const push = async (): Promise<void> => {
		setPushing(true);
		setStatus(null);
		setError(null);
		try {
			const result = await window.cloud.push();
			const failedCount = result.failed.length;
			setStatus({
				ok: failedCount === 0,
				message:
					failedCount === 0
						? t('settings.cloud.pushOk', { count: result.uploaded.length })
						: t('settings.cloud.pushPartial', { uploaded: result.uploaded.length, failed: failedCount }),
			});
		} catch (err) {
			setError(getErrorMessage(err, t('settings.cloud.errors.push')));
		} finally {
			setPushing(false);
		}
	};

	const renderField = (field: FieldDef, value: string): React.JSX.Element => (
		<SettingsField key={field.key} id={`cloud-${field.key}`} label={t(field.labelKey)}>
			<Input
				id={`cloud-${field.key}`}
				type={field.type ?? 'text'}
				value={value}
				placeholder={field.placeholder}
				autoComplete="off"
				onChange={(event) => update(field.key, event.target.value)}
			/>
		</SettingsField>
	);

	const viewRows: readonly { labelKey: string; value: string }[] = config
		? [
				{ labelKey: 'settings.cloud.endpoint', value: config.endpoint || t('settings.cloud.endpointDefault') },
				{ labelKey: 'settings.cloud.region', value: config.region },
				{ labelKey: 'settings.cloud.bucket', value: config.bucket },
				{ labelKey: 'settings.cloud.accessKeyId', value: mask(config.accessKeyId) },
				{ labelKey: 'settings.cloud.secretAccessKey', value: mask(config.secretAccessKey) },
			]
		: [];

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.cloud')}
				description={t('settings.cloud.description')}
			/>

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

			<Card size="sm">
				<CardHeader className="border-b">
					<CardTitle>{t('settings.cloud.connectionTitle')}</CardTitle>
					<CardDescription className="text-xs">
						{t('settings.cloud.connectionDescription')}
					</CardDescription>
					{config && !editing && (
						<CardAction>
							<Badge variant="secondary" className="gap-1 text-[10px]">
								<CheckCircle2 className="size-3" />
								{t('settings.cloud.enabled')}
							</Badge>
						</CardAction>
					)}
				</CardHeader>

				<CardContent>
					{!config ? (
						<SettingsLoadingRows rows={4} />
					) : editing && draft ? (
						<div className="space-y-5">
							<section className="space-y-3">
								<GroupHeading>{t('settings.cloud.connectionTitle')}</GroupHeading>
								{renderField(CONNECTION_FIELDS[0], draft.endpoint)}
								<div className="grid gap-3 sm:grid-cols-2">
									{renderField(CONNECTION_FIELDS[1], draft.region)}
									{renderField(CONNECTION_FIELDS[2], draft.bucket)}
								</div>
							</section>

							<section className="space-y-3">
								<GroupHeading>{t('settings.cloud.credentialsTitle')}</GroupHeading>
								{CREDENTIAL_FIELDS.map((field) => renderField(field, draft[field.key]))}
							</section>

							<section className="space-y-2">
								<GroupHeading>{t('settings.cloud.optionsTitle')}</GroupHeading>
								<div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
									<div className="min-w-0">
										<div className="text-[13px] font-medium leading-4 text-foreground">
											{t('settings.cloud.forcePathStyle')}
										</div>
										<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
											{t('settings.cloud.forcePathStyleDescription')}
										</p>
									</div>
									<Switch
										checked={draft.forcePathStyle}
										onCheckedChange={(checked) => update('forcePathStyle', checked)}
									/>
								</div>
							</section>

							<section className="space-y-2">
								<GroupHeading>{t('settings.cloud.filesTitle')}</GroupHeading>
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.cloud.filesDescription')}
								</p>
								{draft.filePaths.length === 0 ? (
									<p className="text-xs text-muted-foreground">{t('settings.cloud.noFiles')}</p>
								) : (
									<div className="space-y-1.5">
										{draft.filePaths.map((filePath) => (
											<Item key={filePath} variant="outline" size="sm">
												<ItemContent className="min-w-0 flex-1">
													<ItemTitle className="max-w-full truncate font-mono text-xs" title={filePath}>
														{filePath}
													</ItemTitle>
												</ItemContent>
												<ItemActions className="ml-auto flex-none">
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														aria-label={t('settings.cloud.removeFile')}
														onClick={() => removeFile(filePath)}
													>
														<Trash2 className="size-3" />
													</Button>
												</ItemActions>
											</Item>
										))}
									</div>
								)}
								<Button type="button" variant="outline" size="sm" onClick={() => void addFiles()}>
									<FilePlus2 className="size-3" />
									{t('settings.cloud.addFiles')}
								</Button>
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
										{t('settings.cloud.forcePathStyle')}
									</dt>
									<dd>
										<Badge variant="secondary" className="text-[10px]">
											{t(config.forcePathStyle ? 'settings.cloud.enabled' : 'settings.cloud.disabled')}
										</Badge>
									</dd>
								</div>
							</dl>

							<section className="space-y-2">
								<GroupHeading>{t('settings.cloud.filesTitle')}</GroupHeading>
								{config.filePaths.length === 0 ? (
									<p className="text-xs text-muted-foreground">{t('settings.cloud.noFiles')}</p>
								) : (
									<ul className="space-y-1">
										{config.filePaths.map((filePath) => (
											<li
												key={filePath}
												className="truncate rounded-md border border-border/60 px-3 py-1.5 font-mono text-xs text-foreground"
												title={filePath}
											>
												{filePath}
											</li>
										))}
									</ul>
								)}
							</section>
						</div>
					)}
				</CardContent>

				{config && (
					<CardFooter className="justify-between gap-2">
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void test()}
								disabled={testing || saving}
							>
								{testing ? t('settings.cloud.testing') : t('settings.cloud.test')}
							</Button>
							{!editing && isConfigured(config) && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => void push()}
									disabled={pushing || config.filePaths.length === 0}
								>
									<UploadCloud className="size-3" />
									{pushing ? t('settings.cloud.pushing') : t('settings.cloud.push')}
								</Button>
							)}
						</div>
						<div className="flex gap-2">
							{editing ? (
								<>
									{isConfigured(config) && (
										<Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
											{t('settings.cloud.cancel')}
										</Button>
									)}
									<Button size="sm" onClick={() => void save()} disabled={saving}>
										{saving ? t('settings.cloud.saving') : t('settings.cloud.save')}
									</Button>
								</>
							) : (
								<Button size="sm" onClick={startEditing}>
									<Pencil className="size-3" />
									{t('settings.cloud.edit')}
								</Button>
							)}
						</div>
					</CardFooter>
				)}
			</Card>

			<SettingsNotice icon={Cloud}>{t('settings.cloud.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default CloudPage;
