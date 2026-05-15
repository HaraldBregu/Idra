import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FolderInput, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { SkillInfo } from '../../../../../shared/skills';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
	SettingsRow,
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
						<Button variant="outline" size="sm" onClick={loadSkills} disabled={loading || importing}>
							<RefreshCw className="size-3" />
							{t('settings.skills.refresh')}
						</Button>
						<Button size="sm" onClick={() => void handleImport()} disabled={loading || importing}>
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
				description={skillsRoot}
			>
				<SettingsPanel>
					{loading ? (
						<div className="grid gap-2 p-2.5">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-5/6" />
						</div>
					) : skills.length === 0 ? (
						<Empty className="min-h-28 gap-3 border-0 p-4">
							<EmptyHeader className="gap-1.5">
								<EmptyMedia variant="icon" className="mb-1 size-10">
									<Sparkles className="size-5" />
								</EmptyMedia>
								<EmptyTitle className="text-sm">{t('settings.skills.empty')}</EmptyTitle>
								<EmptyDescription className="text-sm leading-5">
									{t('settings.skills.emptyDescription')}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
						) : (
							skills.map((skill) => (
									<SettingsRow
										key={skill.id}
										icon={Sparkles}
										title={
											<span className="flex min-w-0 flex-wrap items-center gap-1.5">
												<span className="truncate">{skill.manifest.name}</span>
												<Badge
													variant="outline"
													className="h-5 rounded-lg bg-muted/40 py-0 font-mono text-xs text-muted-foreground"
												>
													{skill.id}
												</Badge>
											</span>
										}
										description={skill.manifest.description ?? skill.folderPath}
										contentClassName="items-center"
										actions={
											<Button variant="destructive" size="sm" onClick={() => handleDelete(skill)}>
												<Trash2 className="size-3" />
												{t('settings.skills.delete')}
											</Button>
										}
									/>
						))
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SkillsPage;
