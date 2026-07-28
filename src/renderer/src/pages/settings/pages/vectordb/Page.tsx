import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const PINECONE_BASE_URL = 'https://api.pinecone.io';

const VectorDbPage: React.FC = () => {
	const { t } = useTranslation();
	const [apiKey, setApiKey] = useState('');
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void window.provider
			.get('pinecone')
			.then((provider) => {
				if (mounted) setApiKey(provider?.apiKey ?? '');
			})
			.catch((err: unknown) => {
				if (mounted) setError(err instanceof Error ? err.message : String(err));
			});
		return () => {
			mounted = false;
		};
	}, []);

	const handleSave = async (): Promise<void> => {
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			await window.provider.set('pinecone', {
				name: 'Pinecone',
				apiKey: apiKey.trim(),
				baseUrl: PINECONE_BASE_URL,
			});
			setSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.vectorDb')}
				description={t('settings.vectorDb.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.vectorDb.connectionTitle')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<SettingsField
							id="vectordb-api-key"
							label={t('settings.vectorDb.apiKey')}
							description={t('settings.vectorDb.apiKeyDescription')}
						>
							<Input
								id="vectordb-api-key"
								type="password"
								value={apiKey}
								placeholder={t('settings.vectorDb.apiKeyPlaceholder')}
								disabled={saving}
								onChange={(event) => setApiKey(event.target.value)}
							/>
						</SettingsField>

						<div className="flex justify-end">
							<Button
								type="button"
								size="sm"
								disabled={saving || !apiKey.trim()}
								onClick={() => void handleSave()}
							>
								{saving ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Save className="size-3" />
								)}
								{t('settings.vectorDb.save')}
							</Button>
						</div>

						{saved && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.vectorDb.saved')}
							</p>
						)}
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default VectorDbPage;
