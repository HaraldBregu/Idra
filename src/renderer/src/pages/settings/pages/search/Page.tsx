import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ExternalLink, KeyRound, LoaderCircle, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import type { SearchEngineId, SearchSettings } from '../../../../../../shared/search_types';
import { getErrorMessage } from '../../../start/constants';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const SEARCH_ENGINES: readonly {
	id: SearchEngineId;
	name: string;
	descriptionKey: string;
	configurationUrl: string;
}[] = [
	{
		id: 'brave',
		name: 'Brave',
		descriptionKey: 'settings.searchEngine.braveDescription',
		configurationUrl: 'https://api-dashboard.search.brave.com/app/keys',
	},
	{
		id: 'tavily',
		name: 'Tavily',
		descriptionKey: 'settings.searchEngine.tavilyDescription',
		configurationUrl: 'https://app.tavily.com/home',
	},
] as const;

const EMPTY_DRAFTS: Record<SearchEngineId, string> = { brave: '', tavily: '' };

const SearchPage: React.FC = () => {
	const { t } = useTranslation();
	const [settings, setSettings] = useState<SearchSettings | null>(null);
	const [drafts, setDrafts] = useState(EMPTY_DRAFTS);
	const [editingEngineId, setEditingEngineId] = useState<SearchEngineId | null>(null);
	const [savingEngineId, setSavingEngineId] = useState<SearchEngineId | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.search.getSettings().then(
			(value) => {
				if (!cancelled) setSettings(value);
			},
			(err) => {
				if (!cancelled) {
					setError(getErrorMessage(err, t('settings.searchEngine.errors.load')));
				}
			}
		);
		return () => {
			cancelled = true;
		};
	}, [t]);

	const saveEngine = async (engineId: SearchEngineId): Promise<void> => {
		const apiKey = drafts[engineId].trim();
		if (!apiKey) return;
		setSavingEngineId(engineId);
		setError(null);
		try {
			setSettings(await window.search.saveEngine(engineId, { apiKey }));
			setDrafts((current) => ({ ...current, [engineId]: '' }));
			setEditingEngineId(null);
		} catch (err) {
			setError(getErrorMessage(err, t('settings.searchEngine.errors.save')));
		} finally {
			setSavingEngineId(null);
		}
	};

	const selectEngine = async (engineId: SearchEngineId): Promise<void> => {
		setSavingEngineId(engineId);
		setError(null);
		try {
			setSettings(await window.search.selectEngine(engineId));
		} catch (err) {
			setError(getErrorMessage(err, t('settings.searchEngine.errors.select')));
		} finally {
			setSavingEngineId(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.searchEngine')}
				description={t('settings.searchEngine.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.searchEngine.engines')}>
				{settings ? (
					<div className="space-y-2">
						{SEARCH_ENGINES.map((engine) => {
							const configured = settings.configured[engine.id];
							const active = configured && settings.engineId === engine.id;
							const editing = editingEngineId === engine.id;
							const saving = savingEngineId === engine.id;
							const canSave = drafts[engine.id].trim().length > 0 && !saving;

							return (
								<Card
									key={engine.id}
									className={cn(
										'rounded-lg border-border bg-card py-0 shadow-none',
										editing && 'border-ring ring-2 ring-ring/20'
									)}
								>
									<CardContent className="p-0">
										<div className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5">
											<ProviderAvatar providerId={engine.id} name={engine.name} />
											<div className="min-w-0">
												<div className="flex min-w-0 items-center gap-1.5">
													<h2 className="truncate text-sm font-semibold leading-tight text-foreground">
														{engine.name}
													</h2>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														className="size-5 text-muted-foreground hover:text-foreground"
														aria-label={t('settings.searchEngine.openSetup', {
															name: engine.name,
														})}
														onClick={() => openExternalUrl(engine.configurationUrl)}
													>
														<ExternalLink className="size-3" />
													</Button>
												</div>
												<p className="truncate text-xs leading-tight text-muted-foreground">
													{t(engine.descriptionKey)}
												</p>
											</div>
											<div className="flex shrink-0 items-center justify-end gap-1.5">
												{active ? (
													<Badge variant="secondary" className="gap-1 text-[10px]">
														<Check className="size-3" />
														{t('settings.searchEngine.active')}
													</Badge>
												) : configured ? (
													<Button
														type="button"
														variant="outline"
														size="xs"
														disabled={savingEngineId !== null}
														onClick={() => void selectEngine(engine.id)}
													>
														{saving ? <LoaderCircle className="size-3 animate-spin" /> : null}
														{t('settings.searchEngine.use')}
													</Button>
												) : !editing ? (
													<Button
														type="button"
														variant="outline"
														size="xs"
														onClick={() => setEditingEngineId(engine.id)}
													>
														{t('settings.searchEngine.connect')}
													</Button>
												) : null}
												{configured && !editing ? (
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														aria-label={t('settings.searchEngine.editKey', {
															name: engine.name,
														})}
														onClick={() => setEditingEngineId(engine.id)}
													>
														<Pencil className="size-3.5" />
													</Button>
												) : null}
											</div>
										</div>

										{editing ? (
											<div className="flex items-center gap-2 px-3 pb-3">
												<Input
													aria-label={t('settings.searchEngine.apiKeyLabel', {
														name: engine.name,
													})}
													autoComplete="off"
													className="h-8 flex-1 text-xs"
													disabled={saving}
													onChange={(event) =>
														setDrafts((current) => ({
															...current,
															[engine.id]: event.target.value,
														}))
													}
													onKeyDown={(event) => {
														if (event.key === 'Enter' && canSave) void saveEngine(engine.id);
													}}
													placeholder={t('settings.searchEngine.apiKeyPlaceholder')}
													spellCheck={false}
													type="password"
													value={drafts[engine.id]}
												/>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={saving}
													onClick={() => {
														setDrafts((current) => ({ ...current, [engine.id]: '' }));
														setEditingEngineId(null);
													}}
												>
													{t('common.cancel')}
												</Button>
												<Button
													type="button"
													size="sm"
													disabled={!canSave}
													onClick={() => void saveEngine(engine.id)}
												>
													{saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
													{t('common.save')}
												</Button>
											</div>
										) : null}
									</CardContent>
								</Card>
							);
						})}
					</div>
				) : (
					<SettingsPanel>
						<SettingsLoadingRows rows={2} />
					</SettingsPanel>
				)}
			</SettingsSection>

			<SettingsNotice icon={KeyRound}>{t('settings.searchEngine.localNote')}</SettingsNotice>
		</SettingsPageShell>
	);
};

export default SearchPage;
