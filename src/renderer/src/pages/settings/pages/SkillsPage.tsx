import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FolderInput, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SkillInfo } from '../../../../../shared/skills';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
	SettingsValue,
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
			const message = t('settings.skills.confirmDelete', {
				name: skill.manifest.name,
			});
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
				icon={Sparkles}
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
				<SettingsNotice icon={AlertTriangle} variant="destructive">
					{errorMessage}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.skills.title')} description={skillsRoot}>
				<SettingsPanel>
					{loading ? (
						<div className="grid gap-2 p-2.5">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-5/6" />
						</div>
					) : skills.length === 0 ? (
						<SettingsEmptyState
							icon={Sparkles}
							title={t('settings.skills.empty')}
							description={t('settings.skills.emptyDescription')}
						/>
					) : (
						skills.map((skill) => (
							<SettingsRow
								key={skill.id}
								title={
									<span className="flex min-w-0 flex-wrap items-center gap-1.5">
										<span className="truncate">{skill.manifest.name}</span>
										<SettingsValue mono className="h-4 py-0 text-[10px]">
											{skill.id}
										</SettingsValue>
									</span>
								}
								description={skill.manifest.description ?? skill.folderPath}
								media={
									<div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/60">
										<Sparkles className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
									</div>
								}
								contentClassName="items-center"
								actionClassName="sm:flex-nowrap"
							>
								<Button variant="destructive" size="xs" onClick={() => handleDelete(skill)}>
									<Trash2 className="size-3" />
									{t('settings.skills.delete')}
								</Button>
							</SettingsRow>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SkillsPage;
