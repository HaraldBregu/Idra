import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { CloudConfig } from '../../../../../../shared/cloud_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from '../../components';

type StringConfigKey = 'endpoint' | 'region' | 'bucket' | 'accessKeyId' | 'secretAccessKey';

const TEXT_FIELDS: readonly {
	key: StringConfigKey;
	labelKey: string;
	type?: 'password';
	placeholder?: string;
}[] = [
	{ key: 'endpoint', labelKey: 'settings.cloud.endpoint', placeholder: 'https://s3.amazonaws.com' },
	{ key: 'region', labelKey: 'settings.cloud.region', placeholder: 'us-east-1' },
	{ key: 'bucket', labelKey: 'settings.cloud.bucket' },
	{ key: 'accessKeyId', labelKey: 'settings.cloud.accessKeyId' },
	{ key: 'secretAccessKey', labelKey: 'settings.cloud.secretAccessKey', type: 'password' },
];

const isConfigured = (config: CloudConfig): boolean =>
	Boolean(config.bucket && config.accessKeyId && config.secretAccessKey);

const mask = (value: string): string =>
	value.length > 4 ? `••••${value.slice(-4)}` : '•'.repeat(value.length);

const CloudPage: React.FC = () => {
	const { t } = useTranslation();
	const [config, setConfig] = useState<CloudConfig | null>(null);
	const [draft, setDraft] = useState<CloudConfig | null>(null);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
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

	const update = <K extends keyof CloudConfig>(key: K, value: CloudConfig[K]): void => {
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

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.cloud')}
				description={t('settings.cloud.description')}
				iconNode={<Cloud className="size-5" strokeWidth={1.8} />}
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

			{!config ? (
				<SettingsPanel>
					<SettingsLoadingRows rows={4} />
				</SettingsPanel>
			) : editing && draft ? (
				<SettingsSection title={t('settings.cloud.connectionTitle')}>
					<SettingsPanel>
						<div className="grid gap-3 p-3">
							{TEXT_FIELDS.map((field) => (
								<SettingsField key={field.key} id={`cloud-${field.key}`} label={t(field.labelKey)}>
									<Input
										id={`cloud-${field.key}`}
										type={field.type ?? 'text'}
										value={draft[field.key]}
										placeholder={field.placeholder}
										autoComplete="off"
										onChange={(event) => update(field.key, event.target.value)}
									/>
								</SettingsField>
							))}
						</div>
						<SettingsRow
							title={t('settings.cloud.forcePathStyle')}
							description={t('settings.cloud.forcePathStyleDescription')}
							actions={
								<Switch
									checked={draft.forcePathStyle}
									onCheckedChange={(checked) => update('forcePathStyle', checked)}
								/>
							}
						/>
					</SettingsPanel>

					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => void test()}
							disabled={testing || saving}
						>
							{testing ? t('settings.cloud.testing') : t('settings.cloud.test')}
						</Button>
						{isConfigured(config) && (
							<Button variant="ghost" size="sm" onClick={cancelEditing} disabled={saving}>
								{t('settings.cloud.cancel')}
							</Button>
						)}
						<Button size="sm" onClick={() => void save()} disabled={saving}>
							{saving ? t('settings.cloud.saving') : t('settings.cloud.save')}
						</Button>
					</div>
				</SettingsSection>
			) : (
				<SettingsSection
					title={t('settings.cloud.connectionTitle')}
					action={
						<Button variant="outline" size="sm" onClick={startEditing}>
							<Pencil className="size-3" />
							{t('settings.cloud.edit')}
						</Button>
					}
				>
					<SettingsPanel>
						<SettingsRow title={t('settings.cloud.endpoint')}>
							<SettingsValue mono>{config.endpoint || t('settings.cloud.endpointDefault')}</SettingsValue>
						</SettingsRow>
						<SettingsRow title={t('settings.cloud.region')}>
							<SettingsValue mono>{config.region}</SettingsValue>
						</SettingsRow>
						<SettingsRow title={t('settings.cloud.bucket')}>
							<SettingsValue mono>{config.bucket}</SettingsValue>
						</SettingsRow>
						<SettingsRow title={t('settings.cloud.accessKeyId')}>
							<SettingsValue mono>{mask(config.accessKeyId)}</SettingsValue>
						</SettingsRow>
						<SettingsRow title={t('settings.cloud.secretAccessKey')}>
							<SettingsValue mono>{mask(config.secretAccessKey)}</SettingsValue>
						</SettingsRow>
						<SettingsRow
							title={t('settings.cloud.forcePathStyle')}
							actions={<Switch checked={config.forcePathStyle} disabled />}
						/>
					</SettingsPanel>

					<div className="flex justify-end">
						<Button
							variant="outline"
							size="sm"
							onClick={() => void test()}
							disabled={testing}
						>
							{testing ? t('settings.cloud.testing') : t('settings.cloud.test')}
						</Button>
					</div>
				</SettingsSection>
			)}

			<SettingsNotice icon={Cloud}>{t('settings.cloud.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default CloudPage;
