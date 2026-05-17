import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FolderInput, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SkillInfo } from '../../../../../shared/skills';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../components';

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

const SkillsPage: React.FC = () => {
	const { t } = useTranslation();
	const [skills, setSkills] = useState<SkillInfo[]>([]);
	const [skillsRoot, setSkillsRoot] = useState('');
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const loadSkills = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			const [list, root] = await Promise.all([window.skills.list(), window.skills.getRoot()]);
			setSkills(list);
			setSkillsRoot(root);
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.skills.loadError')));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadSkills();
	}, [loadSkills]);

	const handleImport = useCallback(async (): Promise<void> => {
		setImporting(true);
		setErrorMessage('');
		try {
			const imported = await window.skills.importSkill();
			if (imported) {
				await loadSkills();
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.skills.importError')));
		} finally {
			setImporting(false);
		}
	}, [loadSkills, t]);

	const handleDelete = useCallback(
		(skill: SkillInfo) => {
			const message = t('settings.skills.confirmDelete', { name: skill.manifest.name });
			if (!window.confirm(message)) return;

			void window.skills
				.delete(skill.id)
				.then(loadSkills)
				.catch((error) => {
					setErrorMessage(getErrorMessage(error, t('settings.skills.deleteError')));
				});
		},
		[loadSkills, t]
	);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.skills')}
				description={t('settings.skills.description')}
				action={
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="xs" onClick={loadSkills} disabled={loading || importing}>
							<RefreshCw className="size-3" />
							{t('settings.skills.refresh')}
						</Button>
						<Button size="xs" onClick={() => void handleImport()} disabled={loading || importing}>
							<FolderInput className="size-3" />
							{importing ? t('settings.skills.importing') : t('settings.skills.import')}
						</Button>
					</div>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.skills.title')}
				description={skillsRoot || undefined}
			>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : skills.length === 0 ? (
						<SettingsEmptyState
							icon={Sparkles}
							title={t('settings.skills.empty')}
							description={t('settings.skills.emptyDescription')}
						/>
					) : (
						skills.map((skill) => (
							<Item key={skill.id} variant="outline" size="sm" className="border-b border-border/60 last:border-b-0">
								<ItemMedia variant="icon">
									<Sparkles className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{skill.manifest.name}</span>
											<Badge
												variant="outline"
												className="h-4 rounded-md bg-muted/40 px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
											>
												{skill.id}
											</Badge>
										</span>
									</ItemTitle>
								</ItemContent>
								<ItemActions>
									<Button variant="destructive" size="xs" onClick={() => handleDelete(skill)}>
										<Trash2 className="size-3" />
										{t('settings.skills.delete')}
									</Button>
								</ItemActions>
							</Item>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SkillsPage;
