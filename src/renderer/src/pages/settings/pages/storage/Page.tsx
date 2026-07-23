import React, { useEffect, useState } from 'react';
import { AlertTriangle, Cloud, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { StorageConfig } from '../../../../../../shared/storage_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsLoadingRows,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../../components';
import { ProviderCard } from './ProviderCard';

type StorageSyncSettings = Awaited<ReturnType<typeof window.storage.getSyncSettings>>;

const SYNC_INTERVAL_OPTIONS: readonly { minutes: number; labelKey: string }[] = [
	{ minutes: 0, labelKey: 'settings.storage.autoSync.off' },
	{ minutes: 15, labelKey: 'settings.storage.autoSync.every15m' },
	{ minutes: 30, labelKey: 'settings.storage.autoSync.every30m' },
	{ minutes: 60, labelKey: 'settings.storage.autoSync.every1h' },
	{ minutes: 180, labelKey: 'settings.storage.autoSync.every3h' },
	{ minutes: 360, labelKey: 'settings.storage.autoSync.every6h' },
	{ minutes: 720, labelKey: 'settings.storage.autoSync.every12h' },
	{ minutes: 1440, labelKey: 'settings.storage.autoSync.every1d' },
	{ minutes: 2880, labelKey: 'settings.storage.autoSync.every2d' },
	{ minutes: 10080, labelKey: 'settings.storage.autoSync.every7d' },
];

const BLANK_STORAGE: StorageConfig = {
	id: '',
	name: '',
	endpoint: '',
	region: 'us-east-1',
	accessKeyId: '',
	secretAccessKey: '',
	bucket: '',
	forcePathStyle: false,
	paths: [],
};

interface StorageEntry {
	key: string;
	storage: StorageConfig;
}

const StoragePage: React.FC = () => {
	const { t } = useTranslation();
	const [entries, setEntries] = useState<StorageEntry[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [syncSettings, setSyncSettings] = useState<StorageSyncSettings | null>(null);
	const [savingSyncSettings, setSavingSyncSettings] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void window.storage.getStorages().then(
			(storages) => {
				if (cancelled) return;
				setEntries(storages.map((storage) => ({ key: storage.id, storage })));
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.storage.errors.load')));
			}
		);
		void window.storage.getSyncSettings().then(
			(settings) => {
				if (!cancelled) setSyncSettings(settings);
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.storage.errors.load')));
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

	const updateSyncInterval = async (minutes: number): Promise<void> => {
		setSavingSyncSettings(true);
		setError(null);
		try {
			const saved = await window.storage.saveSyncSettings({ intervalMinutes: minutes });
			setSyncSettings(saved);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.save')));
		} finally {
			setSavingSyncSettings(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.storage')}
				description={t('settings.storage.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.storage.autoSync.title')}
				description={t('settings.storage.autoSync.description')}
			>
				<SettingsPanel>
					<SettingsRow title={t('settings.storage.autoSync.interval')}>
						<Select
							value={syncSettings ? String(syncSettings.intervalMinutes) : undefined}
							onValueChange={(value) => void updateSyncInterval(Number(value))}
							disabled={!syncSettings || savingSyncSettings}
						>
							<SelectTrigger id="storage-sync-interval" className="h-7 w-44 text-xs">
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
					</SettingsRow>
				</SettingsPanel>
			</SettingsSection>

			{!entries ? (
				<SettingsLoadingRows rows={4} />
			) : (
				<>
					{entries.length === 0 && (
						<SettingsNotice>{t('settings.storage.empty')}</SettingsNotice>
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
						{t('settings.storage.addProvider')}
					</Button>
				</>
			)}

			<SettingsNotice icon={Cloud}>{t('settings.storage.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default StoragePage;
