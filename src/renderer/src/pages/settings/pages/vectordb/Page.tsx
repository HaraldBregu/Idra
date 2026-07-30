import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { CatalogService } from '../../../../../../shared/provider_types';
import type { DatabaseConfiguration } from '../../../../../../shared/database_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsRow,
} from '../../components';

const VectorDbPage: React.FC = () => {
	const { t } = useTranslation();
	const [databases, setDatabases] = useState<CatalogService[] | null>(null);
	const [configuration, setConfiguration] = useState<DatabaseConfiguration>({
		providerId: undefined,
		databaseId: undefined,
	});
	const [apiKey, setApiKey] = useState('');
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void Promise.all([window.app.databases(), window.database.getConfiguration()]).then(
			([entries, stored]) => {
				if (cancelled) return;
				setDatabases([...entries]);
				setConfiguration(stored);
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.vectorDb.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	useEffect(() => {
		const providerId = configuration.providerId;
		if (!providerId) {
			setApiKey('');
			return;
		}
		let cancelled = false;
		void window.provider.get(providerId).then(
			(stored) => {
				if (!cancelled) setApiKey(stored?.apiKey ?? '');
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.vectorDb.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [configuration.providerId, t]);

	const entries = databases ?? [];
	const providers = [...new Map(entries.map((entry) => [entry.provider.id, entry.provider])).values()];
	const providerDatabases = entries.filter(
		(entry) => entry.provider.id === configuration.providerId
	);
	const selected = providerDatabases.find((entry) => entry.id === configuration.databaseId);

	const selectProvider = (providerId: string | null): void => {
		if (!providerId) return;
		setSaved(false);
		setConfiguration({
			providerId,
			databaseId: entries.find((entry) => entry.provider.id === providerId)?.id,
		});
	};

	const selectDatabase = (databaseId: string | null): void => {
		if (!databaseId) return;
		setSaved(false);
		setConfiguration((current) => ({ ...current, databaseId }));
	};

	const handleSave = async (): Promise<void> => {
		const provider = providers.find((entry) => entry.id === configuration.providerId);
		if (!provider || !selected) return;
		setSaving(true);
		setSaved(false);
		setError(null);
		try {
			await window.provider.set(
				{
					id: provider.id,
					name: provider.name,
					apiKey: apiKey.trim(),
					baseUrl: selected.url ?? provider.baseUrl,
				},
				'databases'
			);
			setConfiguration(await window.database.saveConfiguration(configuration));
			setSaved(true);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.vectorDb.errors.save')));
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

			{!databases ? (
				<SettingsLoadingRows rows={3} />
			) : providers.length === 0 ? (
				<SettingsNotice>{t('settings.vectorDb.empty')}</SettingsNotice>
			) : (
				<Card size="sm">
					<CardHeader className="border-b">
						<CardTitle>{t('settings.vectorDb.connectionTitle')}</CardTitle>
						<CardDescription className="text-xs">
							{t('settings.vectorDb.connectionDescription')}
						</CardDescription>
					</CardHeader>

					<CardContent className="p-0!">
						<SettingsRow
							title={t('settings.vectorDb.provider')}
							description={t('settings.vectorDb.providerDescription')}
							actions={
								<Select value={configuration.providerId ?? ''} onValueChange={selectProvider}>
									<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{providers.map((provider) => (
											<SelectItem key={provider.id} value={provider.id}>
												{provider.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							}
						/>

						<SettingsRow
							title={t('settings.vectorDb.database')}
							description={t('settings.vectorDb.databaseDescription')}
							actions={
								<Select
									value={configuration.databaseId ?? ''}
									onValueChange={selectDatabase}
									disabled={providerDatabases.length === 0}
								>
									<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{providerDatabases.map((entry) => (
											<SelectItem key={entry.id} value={entry.id}>
												{entry.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							}
						/>

						<SettingsRow
							title={t('settings.vectorDb.apiKey')}
							description={t('settings.vectorDb.apiKeyDescription')}
							actions={
								<Input
									id="vectordb-api-key"
									type="password"
									className="w-56 max-w-full"
									value={apiKey}
									placeholder={t('settings.vectorDb.apiKeyPlaceholder')}
									disabled={saving || !configuration.providerId}
									onChange={(event) => {
										setSaved(false);
										setApiKey(event.target.value);
									}}
								/>
							}
						/>
					</CardContent>

					<CardFooter className="justify-end gap-2">
						{saved && (
							<p className="mr-auto text-[11px] leading-4 text-muted-foreground">
								{t('settings.vectorDb.saved')}
							</p>
						)}
						<Button
							size="sm"
							disabled={saving || !selected || !apiKey.trim()}
							onClick={() => void handleSave()}
						>
							{saving ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}
							{t('settings.vectorDb.save')}
						</Button>
					</CardFooter>
				</Card>
			)}
		</SettingsPageShell>
	);
};

export default VectorDbPage;
