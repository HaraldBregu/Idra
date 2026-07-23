import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { FileStorageConfig } from '../../../../../../shared/file_storage_types';
import { getErrorMessage } from '../../../start/constants';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsLoadingRows } from '../../components';
import { ProviderCard } from './ProviderCard';

const BLANK_STORAGE: FileStorageConfig = {
	id: '',
	name: '',
	endpoint: '',
	region: 'us-east-1',
	accessKeyId: '',
	secretAccessKey: '',
	bucket: '',
	forcePathStyle: false,
	filePaths: [],
};

interface StorageEntry {
	key: string;
	storage: FileStorageConfig;
}

const FileStoragePage: React.FC = () => {
	const { t } = useTranslation();
	const [entries, setEntries] = useState<StorageEntry[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.fileStorage.getFileStorages().then(
			(storages) => {
				if (cancelled) return;
				setEntries(storages.map((storage) => ({ key: storage.id, storage })));
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.fileStorage.errors.load')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	const addProvider = (): void => {
		setEntries((current) => [
			...(current ?? []),
			{ key: crypto.randomUUID(), storage: BLANK_STORAGE },
		]);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.fileStorage')}
				description={t('settings.fileStorage.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{!entries ? (
				<SettingsLoadingRows rows={4} />
			) : (
				<>
					{entries.length === 0 && (
						<SettingsNotice>{t('settings.fileStorage.empty')}</SettingsNotice>
					)}

					{entries.map((entry) => (
						<ProviderCard
							key={entry.key}
							storage={entry.storage}
							onSaved={(saved) =>
								setEntries((current) =>
									current?.map((item) =>
										item.key === entry.key ? { ...item, storage: saved } : item
									) ?? current
								)
							}
							onRemoved={() =>
								setEntries((current) => current?.filter((item) => item.key !== entry.key) ?? current)
							}
						/>
					))}

					<Button variant="outline" size="sm" onClick={addProvider} className="self-start">
						<Plus className="size-3" />
						{t('settings.fileStorage.addProvider')}
					</Button>
				</>
			)}
		</SettingsPageShell>
	);
};

export default FileStoragePage;
