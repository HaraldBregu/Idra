import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, LoaderCircle, Pencil, Plus, Cloud, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import type { StoredProvider } from '@shared/provider_types';
import type { StorageConfig } from '@shared/storage_types';
import { providers } from '@/lib/providers';
import {
	actionableProviderCatalog,
	getErrorMessage,
	MASKED_API_KEY_LABEL,
} from '../../../start/constants';
import type { ProviderCatalogItem, ProviderSetupEntry } from '../../../start/types';
import {
	SettingsNotice,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
	SettingsField,
	SettingsLoadingRows,
} from '../../components';
import { ProviderCard } from '../storage/ProviderCard';
import { DEFAULT_SYNC_INTERVAL_MINUTES } from '../storage/constants';

const PINECONE_BASE_URL = 'https://api.pinecone.io';
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

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const [providerEntries, setProviderEntries] = useState<ProviderSetupEntry[]>(() =>
		actionableProviderCatalog().map((provider, index) => ({
			providerId: provider.id,
			apiKey: '',
			apiKeySaved: false,
			editing: index === 0,
		}))
	);
	const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [vectorDbApiKey, setVectorDbApiKey] = useState('');
	const [vectorDbSaving, setVectorDbSaving] = useState(false);
	const [vectorDbSaved, setVectorDbSaved] = useState(false);
	const [vectorDbError, setVectorDbError] = useState<string | null>(null);
	const [storageEntries, setStorageEntries] = useState<StorageEntry[] | null>(null);
	const [storageError, setStorageError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		void Promise.all(
			actionableProviderCatalog().map(async (provider) => {
				const stored = await window.provider.get(provider.id);
				return [provider.id, (stored?.apiKey.trim().length ?? 0) > 0] as const;
			})
		)
			.then((entries) => {
				if (cancelled) return;
				const savedStatus: Record<string, boolean> = Object.fromEntries(entries);
				const hasSavedProvider = Object.values(savedStatus).some(Boolean);

				setProviderEntries((currentEntries) =>
					actionableProviderCatalog().map((provider, index) => {
						const current = currentEntries.find((entry) => entry.providerId === provider.id);
						const draft = current?.apiKey ?? '';
						const hasDraft = draft.trim().length > 0;
						const saved = savedStatus[provider.id] ?? false;

						return {
							providerId: provider.id,
							apiKey: draft,
							apiKeySaved: saved,
							editing: hasDraft
								? (current?.editing ?? false)
								: saved
									? false
									: (current?.editing ?? (!hasSavedProvider && index === 0)),
						};
					})
				);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(getErrorMessage(err, 'Could not check saved provider access.'));
			});

		// Load Vector DB
		void window.provider
			.get('pinecone')
			.then((provider) => {
				if (cancelled) setVectorDbApiKey(provider?.apiKey ?? '');
			})
			.catch((err: unknown) => {
				if (!cancelled) setVectorDbError(err instanceof Error ? err.message : String(err));
			});

		// Load Storage configs
		void window.storage.getStorages().then(
			(storages) => {
				if (!cancelled) setStorageEntries(storages.map((storage) => ({ key: storage.id, storage })));
			},
			(err) => {
				if (!cancelled) setStorageError(getErrorMessage(err, t('settings.storage.errors.load')));
			}
		);

		return () => {
			cancelled = true;
		};
	}, [t]);

	const updateProviderEntry = (providerId: string, patch: Partial<ProviderSetupEntry>): void => {
		setProviderEntries((currentEntries) =>
			currentEntries.map((entry) =>
				entry.providerId === providerId ? { ...entry, ...patch } : entry
			)
		);
	};

	const handleProviderApiKeyChange = (providerId: string, apiKey: string): void => {
		updateProviderEntry(providerId, { apiKey });
		setError(null);
	};

	const handleOpenProviderLink = (provider: ProviderCatalogItem): void => {
		if (!provider.apiConfigurationUrl) return;
		openExternalUrl(provider.apiConfigurationUrl);
	};

	const toStoredProvider = (providerId: string, apiKey: string): StoredProvider | undefined => {
		const provider = providers().find((item) => item.id === providerId);
		if (!provider) return undefined;

		return {
			id: provider.id,
			name: provider.name,
			apiKey,
			baseUrl: provider.baseUrl,
		};
	};

	const saveProviderEntry = async (providerId: string): Promise<void> => {
		const entry = providerEntries.find((item) => item.providerId === providerId);
		const apiKey = entry?.apiKey.trim() ?? '';
		if (!entry || !apiKey) return;

		setSavingProviderId(providerId);
		setError(null);
		try {
			const provider = toStoredProvider(providerId, apiKey);
			if (!provider) throw new Error('Unknown provider.');
			await window.provider.set(provider);
			updateProviderEntry(providerId, { apiKey: '', apiKeySaved: true, editing: false });
		} catch (err) {
			setError(getErrorMessage(err, 'Could not save provider API key.'));
		} finally {
			setSavingProviderId(null);
		}
	};

	const handleVectorDbSave = async (): Promise<void> => {
		setVectorDbSaving(true);
		setVectorDbSaved(false);
		setVectorDbError(null);
		try {
			await window.provider.set({
				id: 'pinecone',
				name: 'Pinecone',
				apiKey: vectorDbApiKey.trim(),
				baseUrl: PINECONE_BASE_URL,
			});
			setVectorDbSaved(true);
		} catch (err) {
			setVectorDbError(err instanceof Error ? err.message : String(err));
		} finally {
			setVectorDbSaving(false);
		}
	};

	const addStorageProvider = (): void => {
		setStorageEntries((current) => [
			...(current ?? []),
			{ key: crypto.randomUUID(), storage: BLANK_STORAGE },
		]);
	};

	return (
		<SettingsPageShell>
			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{vectorDbError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{vectorDbError}
				</SettingsNotice>
			)}
			{storageError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{storageError}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.overview.groups.mlModels')}
				description={t('settings.providers.mlModelsDescription')}
			>
				<div className="space-y-3 py-4">
					{actionableProviderCatalog().map((provider) => {
						const entry = providerEntries.find((item) => item.providerId === provider.id);
						const connected = entry?.apiKeySaved ?? false;
						const editing = entry?.editing ?? false;
						const savingThisProvider = savingProviderId === provider.id;
						const canSaveProvider =
							!!entry && !savingThisProvider && entry.apiKey.trim().length > 0;

						return (
							<Card
								key={provider.id}
								className={cn(
									'rounded-lg border-border bg-card py-0 shadow-none',
									editing && 'border-ring ring-2 ring-ring/20',
									!provider.supported && 'opacity-70'
								)}
							>
								<CardContent className="p-0">
									<div
										className={cn(
											'grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5',
											editing && 'pb-2'
										)}
									>
										<ProviderAvatar providerId={provider.id} name={provider.name} />
										<div className="min-w-0 flex-1">
											<div className="flex min-w-0 items-center gap-1.5">
												<h2 className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
													{provider.name}
												</h2>
												<Button
													type="button"
													variant="ghost"
													size="icon-xs"
													className="size-5 text-muted-foreground hover:text-foreground"
													aria-label={`Open ${provider.name} API setup`}
													onClick={() => handleOpenProviderLink(provider)}
												>
													<ExternalLink className="size-3" />
												</Button>
											</div>
											<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
												{connected ? MASKED_API_KEY_LABEL : provider.capabilities}
											</p>
										</div>
										<div className="flex shrink-0 justify-end gap-2">
											{provider.supported ? (
												connected && !editing ? (
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														aria-label={`Edit ${provider.name} API key`}
														onClick={() =>
															updateProviderEntry(provider.id, {
																editing: true,
																apiKey: '',
															})
														}
													>
														<Pencil className="size-3.5" />
													</Button>
												) : editing ? null : (
													<Button
														type="button"
														variant="outline"
														size="xs"
														onClick={() => updateProviderEntry(provider.id, { editing: true })}
													>
														Connect
													</Button>
												)
											) : (
												<Button type="button" variant="outline" size="xs" disabled>
													Soon
												</Button>
											)}
										</div>
									</div>

									{provider.supported && editing && entry ? (
										<div className="flex items-center gap-2 px-3 pb-3">
											<Input
												aria-label={`${provider.name} API key`}
												autoComplete="off"
												className="h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground"
												disabled={savingThisProvider}
												onChange={(event) =>
													handleProviderApiKeyChange(provider.id, event.target.value)
												}
												onKeyDown={(event) => {
													if (event.key === 'Enter' && canSaveProvider) {
														void saveProviderEntry(provider.id);
													}
												}}
												placeholder={t('settings.providers.apiKeyPlaceholder')}
												spellCheck={false}
												type="password"
												value={entry.apiKey}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={savingThisProvider}
												onClick={() =>
													updateProviderEntry(provider.id, { apiKey: '', editing: false })
												}
											>
												{t('common.cancel')}
											</Button>
											<Button
												type="button"
												size="sm"
												disabled={!canSaveProvider}
												onClick={() => void saveProviderEntry(provider.id)}
											>
												{savingThisProvider ? (
													<LoaderCircle className="size-3.5 animate-spin" />
												) : null}
												{t('common.save')}
											</Button>
										</div>
									) : null}
								</CardContent>
							</Card>
						);
					})}
				</div>
			</SettingsSection>

			<SettingsSection
				title={t('settings.overview.groups.vectorDatabases')}
				description={t('settings.providers.vectorDatabasesDescription')}
			>
				<SettingsPanel>
					<div className="grid gap-3 px-4 py-4">
						<SettingsField
							id="vectordb-api-key"
							label={t('settings.vectorDb.apiKey')}
							description={t('settings.vectorDb.apiKeyDescription')}
						>
							<Input
								id="vectordb-api-key"
								type="password"
								value={vectorDbApiKey}
								placeholder={t('settings.vectorDb.apiKeyPlaceholder')}
								disabled={vectorDbSaving}
								onChange={(event) => setVectorDbApiKey(event.target.value)}
							/>
						</SettingsField>

						<div className="flex justify-end">
							<Button
								type="button"
								size="sm"
								disabled={vectorDbSaving || !vectorDbApiKey.trim()}
								onClick={() => void handleVectorDbSave()}
							>
								{vectorDbSaving ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Save className="size-3" />
								)}
								{t('settings.vectorDb.save')}
							</Button>
						</div>

						{vectorDbSaved && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.vectorDb.saved')}
							</p>
						)}
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.tabs.storage')}
				description={t('settings.storage.description')}
			>
				{storageError && (
					<SettingsNotice variant="destructive" icon={AlertTriangle}>
						{storageError}
					</SettingsNotice>
				)}

				{!storageEntries ? (
					<SettingsLoadingRows rows={4} />
				) : (
					<div className="space-y-3 px-4 py-4">
						{storageEntries.length === 0 && (
							<SettingsNotice>{t('settings.storage.empty')}</SettingsNotice>
						)}

						{storageEntries.map((entry) => (
							<ProviderCard
								key={entry.key}
								storage={entry.storage}
								onSaved={(saved) =>
									setStorageEntries((current) =>
										current?.map((item) =>
											item.key === entry.key ? { ...item, storage: saved } : item
										) ?? current
									)
								}
								onRemoved={() =>
									setStorageEntries((current) =>
										current?.filter((item) => item.key !== entry.key) ?? current
									)
								}
							/>
						))}

						<Button variant="outline" size="sm" onClick={addStorageProvider} className="self-start">
							<Plus className="size-3" />
							{t('settings.storage.addProvider')}
						</Button>
					</div>
				)}

				<SettingsNotice icon={Cloud}>{t('settings.storage.localNote')}</SettingsNotice>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ProvidersPage;
