import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
	SettingsCollapsibleCard,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageShell,
	SettingsRow,
} from '../../components';

const VALUE_SEPARATOR = '\u001F';

function databaseKey(entry: CatalogService): string {
	return `${entry.provider.id}${VALUE_SEPARATOR}${entry.id}`;
}

function databaseLabel(entry: CatalogService): string {
	return `${entry.provider.name} / ${entry.name || entry.id}`;
}

const VectorDbPage: React.FC = () => {
	const { t } = useTranslation();
	const [databases, setDatabases] = useState<CatalogService[] | null>(null);
	const [configuration, setConfiguration] = useState<DatabaseConfiguration>({
		providerId: undefined,
		databaseId: undefined,
	});
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

	const entries = databases ?? [];
	const selected = entries.find(
		(entry) =>
			entry.id === configuration.databaseId && entry.provider.id === configuration.providerId
	);

	const selectDatabase = async (value: string | null): Promise<void> => {
		const entry = entries.find((item) => databaseKey(item) === value);
		if (!entry) return;
		const next = { providerId: entry.provider.id, databaseId: entry.id };
		setConfiguration(next);
		setError(null);
		try {
			setConfiguration(await window.database.saveConfiguration(next));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.vectorDb.errors.save')));
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
				<SettingsLoadingRows rows={2} />
			) : entries.length === 0 ? (
				<SettingsNotice>{t('settings.vectorDb.empty')}</SettingsNotice>
			) : (
				<Card size="sm">
					<CardHeader className="border-b">
						<CardTitle>{t('settings.vectorDb.defaultTitle')}</CardTitle>
					</CardHeader>

					<CardContent className="p-0!">
						<SettingsRow
							title={t('settings.vectorDb.database')}
							description={t('settings.vectorDb.databaseDescription')}
							actions={
								<Select
									value={selected ? databaseKey(selected) : null}
									onValueChange={(value) => void selectDatabase(value)}
								>
									<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
										<SelectValue placeholder={t('settings.vectorDb.databasePlaceholder')}>
											{selected && databaseLabel(selected)}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{entries.map((entry) => (
											<SelectItem key={databaseKey(entry)} value={databaseKey(entry)}>
												{databaseLabel(entry)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							}
						/>
					</CardContent>
				</Card>
			)}
		</SettingsPageShell>
	);
};

export default VectorDbPage;
