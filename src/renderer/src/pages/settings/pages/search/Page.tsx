import React, { useEffect, useState } from 'react';
import { AlertTriangle, KeyRound, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
	Card,
	CardAction,
	CardDescription,
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
import { SEARCH_ENGINES } from './catalog';
import { Engine } from './Engine';

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

	const handleEngineChange = (engineId: string | null): void => {
		if (engineId === null) return;
		void selectEngine(engineId as SearchEngineId);
	};

	const selectedEngine = SEARCH_ENGINES.find((engine) => engine.id === settings?.engineId);

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

			{settings && (
				<SettingsSection title={t('settings.searchEngine.defaultTitle')}>
					<Card size="sm">
						<CardHeader className="items-center">
							<div className="flex min-w-0 flex-1 items-center gap-2.5">
								<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
									<Search className="size-4 text-muted-foreground" />
								</div>
								<div className="min-w-0">
									<CardTitle>{t('settings.searchEngine.provider')}</CardTitle>
									<CardDescription>
										{t('settings.searchEngine.defaultDescription')}
									</CardDescription>
								</div>
							</div>
							<CardAction className="self-center">
								<Select
									value={settings.engineId}
									onValueChange={handleEngineChange}
									disabled={savingEngineId !== null}
								>
									<SelectTrigger
										size="sm"
										className="w-32 text-xs [&_svg]:size-3"
										aria-label={t('settings.searchEngine.defaultTitle')}
									>
										<SelectValue>{selectedEngine?.name}</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{SEARCH_ENGINES.map((engine) => (
											<SelectItem
												key={engine.id}
												value={engine.id}
												disabled={!settings.configured[engine.id]}
											>
												{engine.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</CardAction>
						</CardHeader>
					</Card>
				</SettingsSection>
			)}

			<SettingsSection title={t('settings.searchEngine.engines')}>
				{settings ? (
					<div className="space-y-2">
						{SEARCH_ENGINES.map((engine) => (
							<Engine
								key={engine.id}
								engine={engine}
								apiKey={drafts[engine.id]}
								selected={settings.engineId === engine.id}
								configured={settings.configured[engine.id]}
								editing={editingEngineId === engine.id}
								saving={savingEngineId === engine.id}
								busy={savingEngineId !== null}
								onApiKeyChange={(apiKey) => {
									setDrafts((current) => ({ ...current, [engine.id]: apiKey }));
								}}
								onCancel={() => {
									setDrafts((current) => ({ ...current, [engine.id]: '' }));
									setEditingEngineId(null);
								}}
								onEdit={() => setEditingEngineId(engine.id)}
								onSave={() => void saveEngine(engine.id)}
								onSelect={() => void selectEngine(engine.id)}
							/>
						))}
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
