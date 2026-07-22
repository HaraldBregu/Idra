import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud } from 'lucide-react';
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

const CloudPage: React.FC = () => {
	const { t } = useTranslation();
	const [config, setConfig] = useState<CloudConfig | null>(null);
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.cloud.getConfig().then(
			(value) => {
				if (!cancelled) setConfig(value);
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
		setConfig((current) => (current ? { ...current, [key]: value } : current));
		setStatus(null);
	};

	const save = async (): Promise<void> => {
		if (!config) return;
		setSaving(true);
		setError(null);
		try {
			setConfig(await window.cloud.saveConfig(config));
			setStatus({ ok: true, message: t('settings.cloud.saved') });
		} catch (err) {
			setError(getErrorMessage(err, t('settings.cloud.errors.save')));
		} finally {
			setSaving(false);
		}
	};

	const test = async (): Promise<void> => {
		if (!config) return;
		setTesting(true);
		setStatus(null);
		const result = await window.cloud.testConnection(config);
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
				icon={Cloud}
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

			{config ? (
				<SettingsSection title={t('settings.cloud.connectionTitle')}>
					<SettingsPanel>
						<div className="grid gap-3 p-3">
							{TEXT_FIELDS.map((field) => (
								<SettingsField key={field.key} id={`cloud-${field.key}`} label={t(field.labelKey)}>
									<Input
										id={`cloud-${field.key}`}
										type={field.type ?? 'text'}
										value={config[field.key]}
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
									checked={config.forcePathStyle}
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
						<Button size="sm" onClick={() => void save()} disabled={saving}>
							{saving ? t('settings.cloud.saving') : t('settings.cloud.save')}
						</Button>
					</div>
				</SettingsSection>
			) : (
				!error && (
					<SettingsPanel>
						<SettingsLoadingRows rows={4} />
					</SettingsPanel>
				)
			)}

			<SettingsNotice icon={Cloud}>{t('settings.cloud.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default CloudPage;
