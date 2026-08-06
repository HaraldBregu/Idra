import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertTriangle,
	ChevronDown,
	FolderOpen,
	LoaderCircle,
	Search,
	Sparkles,
	Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { RagMatch } from '../../../../../../main/rag';
import type { RagConfiguration } from '../../../../../../shared/rag_types';
import type { DatabaseConfiguration } from '../../../../../../shared/database_types';
import type { CatalogService } from '../../../../../../shared/provider_types';
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

const VALUE_SEPARATOR = '\u001F';

function databaseKey(entry: CatalogService): string {
	return `${entry.provider.id}${VALUE_SEPARATOR}${entry.id}`;
}

function databaseLabel(entry: CatalogService): string {
	return `${entry.provider.name} / ${entry.name || entry.id}`;
}

const RagPage: React.FC = () => {
	const { t } = useTranslation();
	const [error, setError] = useState<string | null>(null);
	const [indexing, setIndexing] = useState(false);
	const [indexed, setIndexed] = useState<{ files: number; vectors: number } | null>(null);
	const [ragConfiguration, setRagConfiguration] = useState<RagConfiguration | null>(null);
	const [savingRagConfiguration, setSavingRagConfiguration] = useState(false);
	const [query, setQuery] = useState('');
	const [searching, setSearching] = useState(false);
	const [matches, setMatches] = useState<RagMatch[] | null>(null);
	const [databases, setDatabases] = useState<CatalogService[] | null>(null);
	const [databaseConfiguration, setDatabaseConfiguration] = useState<DatabaseConfiguration>({
		providerId: undefined,
		databaseId: undefined,
		providers: [],
	});

	useEffect(() => {
		let cancelled = false;
		void Promise.all([window.app.databases(), window.database.getConfiguration()]).then(
			([entries, configuration]) => {
				if (cancelled) return;
				setDatabases([...entries]);
				setDatabaseConfiguration(configuration);
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
		let cancelled = false;
		void window.agent.ragGetConfiguration().then(
			(configuration) => {
				if (!cancelled) setRagConfiguration(configuration);
			},
			(err) => {
				if (!cancelled) setError(getErrorMessage(err, t('settings.rag.loadError')));
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	const handleIndex = async (): Promise<void> => {
		if (!ragConfiguration?.folders.length) return;
		setIndexing(true);
		setError(null);
		setIndexed(null);
		try {
			setIndexed(await window.agent.ragIndex());
		} catch (err) {
			setError(
				err instanceof Error && err.message.trim() ? err.message : t('settings.rag.indexError')
			);
		} finally {
			setIndexing(false);
		}
	};

	const saveRagConfiguration = async (next: RagConfiguration): Promise<void> => {
		setSavingRagConfiguration(true);
		setError(null);
		try {
			setRagConfiguration(await window.agent.ragSaveConfiguration(next));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.rag.saveError')));
		} finally {
			setSavingRagConfiguration(false);
		}
	};

	const pickSourceFolder = async (): Promise<void> => {
		setError(null);
		try {
			const selected = await window.agent.ragPickFolder();
			if (selected && ragConfiguration) {
				await saveRagConfiguration({
					...ragConfiguration,
					folders: [...new Set([...ragConfiguration.folders, selected])],
				});
				setIndexed(null);
			}
		} catch (err) {
			setError(
				err instanceof Error && err.message.trim() ? err.message : t('settings.rag.pickFolderError')
			);
		}
	};

	const handleSearch = async (): Promise<void> => {
		if (!query.trim()) return;
		setSearching(true);
		setError(null);
		setMatches(null);
		try {
			setMatches(await window.agent.ragSearch(query));
		} catch (err) {
			setError(
				err instanceof Error && err.message.trim() ? err.message : t('settings.rag.searchError')
			);
		} finally {
			setSearching(false);
		}
	};

	const selectDatabase = async (value: string | null): Promise<void> => {
		const entry = databases?.find((item) => databaseKey(item) === value);
		if (!entry) return;
		const next = {
			...databaseConfiguration,
			providerId: entry.provider.id,
			databaseId: entry.id,
		};
		setDatabaseConfiguration(next);
		setError(null);
		try {
			setDatabaseConfiguration(await window.database.saveConfiguration(next));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.vectorDb.errors.save')));
		}
	};

	const selectedDatabase = databases?.find(
		(entry) =>
			entry.id === databaseConfiguration.databaseId &&
			entry.provider.id === databaseConfiguration.providerId
	);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.rag')}
				description={t('settings.rag.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.vectorDb.defaultTitle')}>
				{!databases ? (
					<SettingsLoadingRows rows={1} />
				) : databases.length === 0 ? (
					<SettingsNotice>{t('settings.vectorDb.empty')}</SettingsNotice>
				) : (
					<Card size="sm" className="gap-0! py-0!">
						<Collapsible>
							<CollapsibleTrigger className="group w-full text-left">
								<CardHeader className="py-3">
									<CardTitle className="flex items-center justify-between">
										{t('settings.vectorDb.database')}
										<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
									</CardTitle>
									<CardDescription className="text-xs">
										{t('settings.vectorDb.databaseDescription')}
									</CardDescription>
								</CardHeader>
							</CollapsibleTrigger>
							<CollapsibleContent className="border-t border-border/60">
								<CardContent className="p-0!">
									<SettingsRow
										title={t('settings.vectorDb.database')}
										description={t('settings.vectorDb.databaseDescription')}
										actions={
									<Select
										value={selectedDatabase ? databaseKey(selectedDatabase) : null}
										onValueChange={(value) => void selectDatabase(value)}
									>
										<SelectTrigger size="sm" className="w-56 max-w-full text-xs">
											<SelectValue placeholder={t('settings.vectorDb.databasePlaceholder')}>
												{selectedDatabase && databaseLabel(selectedDatabase)}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{databases.map((entry) => (
												<SelectItem key={databaseKey(entry)} value={databaseKey(entry)}>
													{databaseLabel(entry)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
										}
									/>
								</CardContent>
							</CollapsibleContent>
						</Collapsible>
					</Card>
				)}
			</SettingsSection>

			<SettingsSection title={t('settings.rag.documentsTitle')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.rag.documentsDescription')}
						</p>
						{ragConfiguration?.folders.length ? (
							ragConfiguration.folders.map((folder) => (
								<div
									key={folder}
									className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1.5"
								>
									<p className="min-w-0 flex-1 truncate text-xs" title={folder}>
										{folder}
									</p>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										disabled={indexing || savingRagConfiguration}
										aria-label={t('settings.rag.removeFolder')}
										onClick={() =>
											void saveRagConfiguration({
												...ragConfiguration,
												folders: ragConfiguration.folders.filter((entry) => entry !== folder),
											})
										}
									>
										<Trash2 className="size-3" />
									</Button>
								</div>
							))
						) : (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.rag.sourcePlaceholder')}
							</p>
						)}

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={indexing || savingRagConfiguration || !ragConfiguration}
								onClick={() => void pickSourceFolder()}
							>
								<FolderOpen className="size-3" />
								{t('settings.rag.pickFolder')}
							</Button>
							<Button
								type="button"
								size="sm"
								disabled={indexing || savingRagConfiguration || !ragConfiguration?.folders.length}
								onClick={() => void handleIndex()}
							>
								{indexing ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Sparkles className="size-3" />
								)}
								{indexing ? t('settings.rag.indexing') : t('settings.rag.index')}
							</Button>
						</div>

						{indexed && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.rag.indexResult', indexed)}
							</p>
						)}
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.rag.scheduleTitle')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<SettingsRow
							title={t('settings.rag.scheduleEnabled')}
							description={t('settings.rag.scheduleDescription')}
							actions={
								<Switch
									checked={ragConfiguration?.scheduleEnabled ?? false}
									disabled={!ragConfiguration || savingRagConfiguration}
									onCheckedChange={(scheduleEnabled) =>
										ragConfiguration &&
										void saveRagConfiguration({ ...ragConfiguration, scheduleEnabled })
									}
								/>
							}
						/>
						<Input
							value={ragConfiguration?.cronExpression ?? ''}
							disabled={!ragConfiguration || savingRagConfiguration}
							placeholder={t('settings.rag.cronPlaceholder')}
							aria-label={t('settings.rag.cronExpression')}
							onChange={(event) =>
								ragConfiguration &&
								setRagConfiguration({ ...ragConfiguration, cronExpression: event.target.value })
							}
							onBlur={() => ragConfiguration && void saveRagConfiguration(ragConfiguration)}
						/>
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title={t('settings.rag.searchTitle')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<Input
							value={query}
							placeholder={t('settings.rag.searchPlaceholder')}
							disabled={searching}
							onChange={(event) => setQuery(event.target.value)}
						/>

						<div className="flex justify-end">
							<Button
								type="button"
								size="sm"
								disabled={searching || !query.trim()}
								onClick={() => void handleSearch()}
							>
								{searching ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Search className="size-3" />
								)}
								{searching ? t('settings.rag.searching') : t('settings.rag.search')}
							</Button>
						</div>

						{matches?.length === 0 && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.rag.noResults')}
							</p>
						)}

						{matches?.map((match) => (
							<div key={`${match.path}-${match.score}`} className="grid gap-0.5">
								<p className="truncate text-xs leading-4">
									{match.path} · {match.score.toFixed(3)}
								</p>
								<p className="line-clamp-3 text-[11px] leading-4 text-muted-foreground">
									{match.text}
								</p>
							</div>
						))}
					</div>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default RagPage;
