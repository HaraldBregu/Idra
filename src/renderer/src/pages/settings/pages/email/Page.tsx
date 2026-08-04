import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../../components';

const EmailPage: React.FC = () => {
	const { t } = useTranslation();
	const [configured, setConfigured] = useState(false);
	const [apiKey, setApiKey] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void window.email
			.getSettings()
			.then((settings) => setConfigured(settings.configured.resend))
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
			.finally(() => setLoading(false));
	}, []);

	const handleSave = async (): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const settings = await window.email.saveProvider('resend', { apiKey });
			setConfigured(settings.configured.resend);
			setApiKey('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.email.title')}
				description={t('settings.email.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.email.providers')}>
				<SettingsPanel>
					<SettingsRow
						title="Resend"
						description={
							loading
								? t('settings.email.loading')
								: configured
									? t('settings.email.configured')
									: t('settings.email.notConfigured')
						}
						className="grid-cols-[minmax(0,1fr)_auto] border-b-0"
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.email.configuration')}>
				<SettingsPanel className="gap-3 p-3">
					<Input
						type="password"
						value={apiKey}
						onChange={(event) => setApiKey(event.target.value)}
						placeholder={t('settings.email.apiKeyPlaceholder')}
						aria-label={t('settings.email.apiKey')}
						disabled={loading || saving}
					/>
					<Button
						type="button"
						size="sm"
						disabled={loading || saving || !apiKey.trim()}
						onClick={() => void handleSave()}
					>
						{saving && <LoaderCircle className="size-3 animate-spin" />}
						{t('settings.email.save')}
					</Button>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default EmailPage;
