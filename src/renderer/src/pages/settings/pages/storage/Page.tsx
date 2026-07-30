import React, { useEffect, useState } from 'react';
import {
	AlertTriangle,
	CalendarClock,
	Cloud,
	FolderPlus,
	FolderSync,
	HardDrive,
	Play,
	Plus,
	Save,
	Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
	StorageConfig,
	StorageSyncFolder,
} from '../../../../../../shared/storage_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../../components';
import { ProviderCard } from './ProviderCard';
import { DEFAULT_SYNC_INTERVAL_MINUTES, SYNC_INTERVAL_OPTIONS } from './constants';

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
	syncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
};

interface StorageEntry {
	key: string;
	storage: StorageConfig;
}

interface StoragePageProps {
	readonly embedded?: boolean;
}

const StoragePage: React.FC<StoragePageProps> = ({ embedded = false }) => {
	const { t } = useTranslation();
	const [entries, setEntries] = useState<StorageEntry[] | null>(null);
	const [availableFolders, setAvailableFolders] = useState<StorageSyncFolder[]>([]);
	const [selectedStorageId, setSelectedStorageId] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<string | null>(null);
	const [savingSync, setSavingSync] = useState(false);
	const [runningSync, setRunningSync] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void Promise.all([window.storage.getStorages(), window.storage.syncFolders()]).then(
			([storages, folders]) => {
				if (cancelled) return;
				setEntries(storages.map((storage) => ({ key: storage.id, storage })));
				setAvailableFolders(folders);
				setSelectedStorageId(storages[0]?.id ?? '');
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

	const savedEntries = (entries ?? []).filter((entry) => Boolean(entry.storage.id));
	const selectedEntry = savedEntries.find((entry) => entry.storage.id === selectedStorageId);
	const selectedStorage = selectedEntry?.storage;
	const builtInPaths = new Set(availableFolders.map((folder) => folder.path));
	const customPaths = selectedStorage?.paths.filter((path) => !builtInPaths.has(path)) ?? [];

	const updateSelectedStorage = (storage: StorageConfig): void => {
		setEntries((current) =>
			current?.map((entry) =>
				entry.storage.id === storage.id ? { ...entry, storage } : entry
			) ?? current
		);
		setSyncStatus(null);
	};

	const pickFolders = async (): Promise<void> => {
		if (!selectedStorage) return;
		setError(null);
		try {
			const paths = await window.storage.pickFolders();
			if (paths.length === 0) return;
			updateSelectedStorage({
				...selectedStorage,
				paths: [...new Set([...selectedStorage.paths, ...paths])],
			});
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.pickFolders')));
		}
	};

	const saveSync = async (): Promise<StorageConfig | undefined> => {
		if (!selectedStorage) return undefined;
		setSavingSync(true);
		setError(null);
		setSyncStatus(null);
		try {
			const saved = await window.storage.saveStorageConfig(selectedStorage);
			updateSelectedStorage(saved);
			setSyncStatus(t('settings.storage.syncSaved'));
			return saved;
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.saveSync')));
			return undefined;
		} finally {
			setSavingSync(false);
		}
	};

	const runSync = async (): Promise<void> => {
		setRunningSync(true);
		setError(null);
		setSyncStatus(null);
		try {
			const saved = await saveSync();
			if (!saved) return;
			const result = await window.storage.push(saved.id);
			setSyncStatus(
				result.failed.length > 0
					? t('settings.storage.pushPartial', {
							uploaded: result.uploaded.length,
							failed: result.failed.length,
						})
					: t('settings.storage.pushOk', { count: result.uploaded.length })
			);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.push')));
		} finally {
			setRunningSync(false);
		}
	};

	return (
		<SettingsPageShell className={embedded ? 'max-w-none px-0 pb-0' : undefined}>
			{!embedded && (
				<SettingsPageHeader
					title={t('settings.tabs.storage')}
					description={t('settings.storage.description')}
				/>
			)}

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
						<SettingsNotice>{t('settings.storage.empty')}</SettingsNotice>
					)}

					{entries.map((entry) => (
						<ProviderCard
							key={entry.key}
							storage={entry.storage}
							onSaved={(saved) =>
								{
									setEntries((current) =>
										current?.map((item) =>
											item.key === entry.key ? { ...item, storage: saved } : item
										) ?? current
									);
									if (!selectedStorageId) setSelectedStorageId(saved.id);
								}
							}
							onRemoved={() =>
								{
									setEntries((current) => {
										const remaining = current?.filter((item) => item.key !== entry.key) ?? current;
										if (entry.storage.id === selectedStorageId) {
											setSelectedStorageId(remaining?.find((item) => item.storage.id)?.storage.id ?? '');
										}
										return remaining;
									});
								}
							}
						/>
					))}

					<Button variant="outline" size="sm" onClick={addProvider} className="self-start">
						<Plus className="size-3" />
						{t('settings.storage.addProvider')}
					</Button>

					{!embedded && savedEntries.length > 0 && (
						<>
							<SettingsSection
								title={t('settings.storage.profile.title')}
								description={t('settings.storage.profile.description')}
							>
								<SettingsPanel>
									<SettingsRow
										icon={HardDrive}
										title={t('settings.storage.profile.label')}
										description={t('settings.storage.profile.help')}
										actions={
											<Select
												value={selectedStorageId}
												onValueChange={(value) => {
													setSelectedStorageId(value ?? '');
													setSyncStatus(null);
												}}
											>
												<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{savedEntries.map(({ storage }) => (
														<SelectItem key={storage.id} value={storage.id}>
															{storage.name || storage.bucket || storage.endpoint || storage.id}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										}
									/>
								</SettingsPanel>
							</SettingsSection>

							{selectedStorage && (
								<SettingsSection
									title={t('settings.storage.sync.title')}
									description={t('settings.storage.sync.description')}
									action={
										<Button
											variant="outline"
											size="sm"
											onClick={() => void pickFolders()}
											disabled={savingSync || runningSync}
										>
											<FolderPlus className="size-3" />
											{t('settings.storage.sync.addFolders')}
										</Button>
									}
								>
									<SettingsPanel>
										{availableFolders.map((folder) => (
											<SettingsRow
												key={folder.path}
												icon={FolderSync}
												title={t(`settings.storage.folders.${folder.key}`)}
												description={folder.path}
												actions={
													<Switch
														checked={selectedStorage.paths.includes(folder.path)}
														aria-label={t(`settings.storage.folders.${folder.key}`)}
														onCheckedChange={(checked) =>
															updateSelectedStorage({
																...selectedStorage,
																paths: checked
																	? [...new Set([...selectedStorage.paths, folder.path])]
																	: selectedStorage.paths.filter((path) => path !== folder.path),
															})
														}
													/>
												}
											/>
										))}

										{customPaths.map((path) => (
											<SettingsRow
												key={path}
												icon={FolderSync}
												title={t('settings.storage.sync.folder')}
												description={path}
												actions={
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={t('settings.storage.sync.removeFolder')}
														onClick={() =>
															updateSelectedStorage({
																...selectedStorage,
																paths: selectedStorage.paths.filter((entry) => entry !== path),
															})
														}
													>
														<Trash2 className="size-3" />
													</Button>
												}
											/>
										))}

										<SettingsRow
											icon={CalendarClock}
											title={t('settings.storage.autoSync.title')}
											description={t('settings.storage.autoSync.description')}
											actions={
												<Select
													value={String(selectedStorage.syncIntervalMinutes)}
													onValueChange={(value) =>
														updateSelectedStorage({
															...selectedStorage,
															syncIntervalMinutes: Number(value),
														})
													}
												>
													<SelectTrigger size="sm" className="w-44 text-xs">
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
											}
										/>

										<div className="flex flex-wrap justify-end gap-2 p-3">
											<Button
												variant="outline"
												size="sm"
												onClick={() => void runSync()}
												disabled={
													savingSync || runningSync || selectedStorage.paths.length === 0
												}
											>
												<Play className="size-3" />
												{runningSync
													? t('settings.storage.sync.running')
													: t('settings.storage.sync.runNow')}
											</Button>
											<Button
												size="sm"
												onClick={() => void saveSync()}
												disabled={savingSync || runningSync}
											>
												<Save className="size-3" />
												{savingSync
													? t('settings.storage.saving')
													: t('settings.storage.sync.save')}
											</Button>
										</div>
									</SettingsPanel>
								</SettingsSection>
							)}

							{syncStatus && <SettingsNotice icon={FolderSync}>{syncStatus}</SettingsNotice>}
						</>
					)}
				</>
			)}

			<SettingsNotice icon={Cloud}>{t('settings.storage.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default StoragePage;
