import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FolderOpen, LoaderCircle, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RagMatch } from '../../../../../../main/rag';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const RagPage: React.FC = () => {
	const { t } = useTranslation();
	const [error, setError] = useState<string | null>(null);
	const [indexing, setIndexing] = useState(false);
	const [indexed, setIndexed] = useState<{ files: number; vectors: number } | null>(null);
	const [query, setQuery] = useState('');
	const [searching, setSearching] = useState(false);
	const [matches, setMatches] = useState<RagMatch[] | null>(null);

	const handleIndex = async (): Promise<void> => {
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

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.rag')} description={t('settings.rag.description')} />

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.rag.documentsTitle')}>
				<SettingsPanel>
					<div className="grid gap-3 px-3 py-3">
						<p className="text-[11px] leading-4 text-muted-foreground">
							{t('settings.rag.documentsDescription')}
						</p>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => void window.agent.ragOpenFolder()}
							>
								<FolderOpen className="size-3" />
								{t('settings.rag.openFolder')}
							</Button>
							<Button type="button" size="sm" disabled={indexing} onClick={() => void handleIndex()}>
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
