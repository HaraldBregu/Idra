import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { SearchEngineId, SearchSettings } from '../../../../../../shared/search_types';
import { getErrorMessage } from '../../../start/constants';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../components';
import { SEARCH_ENGINES } from './catalog';

const SearchPage: React.FC = () => {
	const { t } = useTranslation();
	const [settings, setSettings] = useState<SearchSettings | null>(null);
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
				<Card size="sm" className="gap-0! py-0!">
					<Collapsible>
						<CollapsibleTrigger className="group w-full text-left">
							<CardHeader className="py-3">
								<CardTitle className="flex items-center justify-between">
									{selectedEngine?.name ?? t('settings.searchEngine.provider')}
									<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
								</CardTitle>
								<CardDescription className="text-xs">
									{selectedEngine
										? t(selectedEngine.descriptionKey)
										: t('settings.searchEngine.defaultDescription')}
								</CardDescription>
							</CardHeader>
						</CollapsibleTrigger>
						<CollapsibleContent className="border-t border-border/60">
						<div className="grid gap-3 px-3 py-3">
							<Select
								value={settings.engineId}
								onValueChange={handleEngineChange}
								disabled={savingEngineId !== null}
							>
								<SelectTrigger
									size="sm"
									className="w-full text-xs [&_svg]:size-3"
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
						</div>
					</CollapsibleContent>
				</Collapsible>
			)}
		</SettingsPageShell>
	);
};

export default SearchPage;
