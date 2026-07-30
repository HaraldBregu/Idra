import React, { useEffect, useState } from 'react';
import {
	AlertTriangle,
	Cloud,
	FolderPlus,
	FolderSync,
	Play,
	Plus,
	Save,
	Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { StorageConfig, StorageSyncFolder } from '../../../../../../shared/storage_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsRow,
} from '../../components';
import { ProviderCard } from './ProviderCard';
import { DEFAULT_SYNC_CRON_EXPRESSION, SYNC_INTERVALS } from './constants';

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
	syncEnabled: false,
	syncCronExpression: DEFAULT_SYNC_CRON_EXPRESSION,
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
	const [draft, setDraft] = useState<StorageConfig | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<string | null>(null);
	const [savingSync, setSavingSync] = useState(false);
	const [runningSync, setRunningSync] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void Promise.all([
			window.storage.getStorages(),
			window.storage.syncFolders(),
			window.storage.getSelectedStorageId(),
		]).then(
			([storages, folders, storedSelection]) => {
				if (cancelled) return;
				setEntries(storages.map((storage) => ({ key: storage.id, storage })));
				setAvailableFolders(folders);
				setSelectedStorageId(
					storages.some((storage) => storage.id === storedSelection)
						? (storedSelection ?? '')
						: (storages[0]?.id ?? '')
				);
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
	const storage = draft ?? selectedEntry?.storage;
	const builtInPaths = new Set(availableFolders.map((folder) => folder.path));
	const customPaths = storage?.paths.filter((path) => !builtInPaths.has(path)) ?? [];
	const intervalValue = !storage?.syncEnabled
		? 'off'
		: (SYNC_INTERVALS.find((interval) => interval.cron === storage.syncCronExpression)?.key ??
			'custom');

	const updateDraft = (next: StorageConfig): void => {
		setDraft(next);
		setSyncStatus(null);
	};

	const cancelEdits = (): void => {
		setDraft(null);
		setSyncStatus(null);
		setError(null);
	};

	const pickFolders = async (): Promise<void> => {
		if (!storage) return;
		setError(null);
		try {
			const paths = await window.storage.pickFolders();
			if (paths.length === 0) return;
			updateDraft({
				...storage,
				paths: [...new Set([...storage.paths, ...paths])],
			});
		} catch (err) {
			setError(getErrorMessage(err, t('settings.storage.errors.pickFolders')));
		}
	};

	const saveSync = async (): Promise<StorageConfig | undefined> => {
		if (!storage) return undefined;
		setSavingSync(true);
		setError(null);
		setSyncStatus(null);
		try {
			const saved = await window.storage.saveStorageConfig(storage);
			setEntries(
				(current) =>
					current?.map((entry) =>
						entry.storage.id === saved.id ? { ...entry, storage: saved } : entry
					) ?? current
			);
			setDraft(null);
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

	const selectProfile = (value: string | null): void => {
		const id = value ?? '';
		setSelectedStorageId(id);
		setDraft(null);
		setSyncStatus(null);
		if (id) {
			void window.storage.setSelectedStorageId(id).catch((err) => {
				setError(getErrorMessage(err, t('settings.storage.errors.selectProfile')));
			});
		}
	};

	const selectInterval = (value: string | null): void => {
		if (!storage || !value) return;
		const cron = SYNC_INTERVALS.find((interval) => interval.key === value)?.cron;
		if (cron) updateDraft({ ...storage, syncCronExpression: cron });
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
			) : embedded ? (
				<>
					{entries.length === 0 && <SettingsNotice>{t('settings.storage.empty')}</SettingsNotice>}

					{entries.map((entry) => (
						<ProviderCard
							key={entry.key}
							storage={entry.storage}
							onSaved={(saved) => {
								setEntries(
									(current) =>
										current?.map((item) =>
											item.key === entry.key ? { ...item, storage: saved } : item
										) ?? current
								);
								if (!selectedStorageId) {
									setSelectedStorageId(saved.id);
									void window.storage.setSelectedStorageId(saved.id);
								}
							}}
							onRemoved={() => {
								setEntries((current) => {
									const remaining = current?.filter((item) => item.key !== entry.key) ?? current;
									if (entry.storage.id === selectedStorageId) {
										setSelectedStorageId(
											remaining?.find((item) => item.storage.id)?.storage.id ?? ''
										);
									}
									return remaining;
								});
							}}
						/>
					))}

					<Button variant="outline" size="sm" onClick={addProvider} className="self-start">
						<Plus className="size-3" />
						{t('settings.storage.addProvider')}
					</Button>
				</>
			) : savedEntries.length === 0 ? (
				<SettingsNotice>{t('settings.storage.empty')}</SettingsNotice>
			) : (
				<>
					<Card size="sm">
						<CardHeader className="border-b">
							<CardTitle>{t('settings.storage.cardTitle')}</CardTitle>
							<CardDescription className="text-xs">
								{t('settings.storage.sync.description')}
							</CardDescription>
						</CardHeader>

						<CardContent className="p-0!">
							<SettingsRow
								title={t('settings.storage.profile.label')}
								description={t('settings.storage.profile.help')}
								actions={
									<Select value={selectedStorageId} onValueChange={selectProfile}>
										<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{savedEntries.map((entry) => (
												<SelectItem key={entry.storage.id} value={entry.storage.id}>
													{entry.storage.name ||
														entry.storage.bucket ||
														entry.storage.endpoint ||
														entry.storage.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								}
							/>

							{storage && (
								<>
									{availableFolders.map((folder) => (
										<SettingsRow
											key={folder.path}
											title={t(`settings.storage.folders.${folder.key}`)}
											description={folder.path}
											actions={
												<Switch
													checked={storage.paths.includes(folder.path)}
													aria-label={t(`settings.storage.folders.${folder.key}`)}
													onCheckedChange={(checked) =>
														updateDraft({
															...storage,
															paths: checked
																? [...new Set([...storage.paths, folder.path])]
																: storage.paths.filter((path) => path !== folder.path),
														})
													}
												/>
											}
										/>
									))}

									{customPaths.map((path) => (
										<SettingsRow
											key={path}
											title={t('settings.storage.sync.folder')}
											description={path}
											actions={
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={t('settings.storage.sync.removeFolder')}
													onClick={() =>
														updateDraft({
															...storage,
															paths: storage.paths.filter((entry) => entry !== path),
														})
													}
												>
													<Trash2 className="size-3" />
												</Button>
											}
										/>
									))}

									<div className="border-b border-border/60 px-3 py-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => void pickFolders()}
											disabled={savingSync || runningSync}
										>
											<FolderPlus className="size-3" />
											{t('settings.storage.sync.addFolders')}
										</Button>
									</div>

									<SettingsRow
										title={t('settings.storage.autoSync.interval')}
										description={t('settings.storage.autoSync.description')}
										actions={
											<>
												<Select
													value={intervalValue}
													onValueChange={selectInterval}
													disabled={!storage.syncEnabled}
												>
													<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{SYNC_INTERVALS.map((interval) => (
															<SelectItem key={interval.key} value={interval.key}>
																{t(`settings.storage.autoSync.${interval.key}`)}
															</SelectItem>
														))}
														{intervalValue === 'custom' && (
															<SelectItem value="custom">{storage.syncCronExpression}</SelectItem>
														)}
													</SelectContent>
												</Select>
												<Switch
													checked={storage.syncEnabled}
													aria-label={t('settings.storage.autoSync.enabled')}
													onCheckedChange={(syncEnabled) => updateDraft({ ...storage, syncEnabled })}
												/>
											</>
										}
									/>
								</>
							)}
						</CardContent>

						<CardFooter className="justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void runSync()}
								disabled={savingSync || runningSync || !storage || storage.paths.length === 0}
							>
								<Play className="size-3" />
								{runningSync
									? t('settings.storage.sync.running')
									: t('settings.storage.sync.runNow')}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={cancelEdits}
								disabled={!draft || savingSync || runningSync}
							>
								{t('settings.storage.cancel')}
							</Button>
							<Button size="sm" onClick={() => void saveSync()} disabled={savingSync || runningSync}>
								<Save className="size-3" />
								{savingSync ? t('settings.storage.saving') : t('settings.storage.sync.save')}
							</Button>
						</CardFooter>
					</Card>

					{syncStatus && <SettingsNotice icon={FolderSync}>{syncStatus}</SettingsNotice>}
				</>
			)}

			<SettingsNotice icon={Cloud}>{t('settings.storage.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default StoragePage;
