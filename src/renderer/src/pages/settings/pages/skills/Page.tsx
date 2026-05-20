import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertTriangle,
	Download,
	Eye,
	FileText,
	RefreshCw,
	Sparkles,
	Trash2,
	Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { SkillInfo } from '../../../../../../shared/skills';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

function compactList(values: readonly string[] | undefined, emptyLabel: string): string {
	return values && values.length > 0 ? values.join(', ') : emptyLabel;
}

function metadataFlag(skill: SkillInfo, key: string): boolean | undefined {
	const value = skill.manifest.metadata?.[key];
	return typeof value === 'boolean' ? value : undefined;
}

function skillVersion(skill: SkillInfo): string {
	return skill.manifest.version?.trim() || '0.1.0';
}

const SkillsPage: React.FC = () => {
	const { t } = useTranslation();
	const [skills, setSkills] = useState<SkillInfo[]>([]);
	const [skillsRoot, setSkillsRoot] = useState('');
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [downloadingId, setDownloadingId] = useState('');
	const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

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
		setSuccessMessage('');
		try {
			const result = await window.skills.importSkill();
			if (result) {
				const importedCount = result.imported.length;
				const skippedCount = result.skipped.length;
				setSuccessMessage(
					t('settings.skills.uploaded', {
						count: String(importedCount),
						skipped: String(skippedCount),
					})
				);
				await loadSkills();
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.skills.uploadError')));
		} finally {
			setImporting(false);
		}
	}, [loadSkills, t]);

	const handleDownload = useCallback(
		async (skill: SkillInfo): Promise<void> => {
			setDownloadingId(skill.id);
			setErrorMessage('');
			setSuccessMessage('');
			try {
				const downloaded = await window.skills.downloadSkill(skill.id);
				if (downloaded) {
					setSuccessMessage(
						t('settings.skills.downloaded', {
							name: skill.manifest.name,
							path: downloaded.destinationPath,
						})
					);
				}
			} catch (error) {
				setErrorMessage(getErrorMessage(error, t('settings.skills.downloadError')));
			} finally {
				setDownloadingId('');
			}
		},
		[t]
	);

	const handleDelete = useCallback(
		(skill: SkillInfo) => {
			const message = t('settings.skills.confirmDelete', { name: skill.manifest.name });
			if (!window.confirm(message)) return;

			setSuccessMessage('');
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
						<Button
							variant="outline"
							size="xs"
							onClick={loadSkills}
							disabled={loading || importing || Boolean(downloadingId)}
						>
							<RefreshCw className="size-3" />
							{t('settings.skills.refresh')}
						</Button>
						<Button size="xs" onClick={() => void handleImport()} disabled={loading || importing}>
							<Upload className="size-3" />
							{importing ? t('settings.skills.uploading') : t('settings.skills.upload')}
						</Button>
					</div>
				}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			{successMessage && (
				<SettingsNotice>
					{successMessage}
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
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
									<ItemTitle className="max-w-full">
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{skill.manifest.name}</span>
											<Badge
												variant="outline"
												className="h-4 rounded-md bg-muted/40 px-1.5 py-0 font-mono text-[10px] text-muted-foreground"
											>
												v{skillVersion(skill)}
											</Badge>
									{metadataFlag(skill, 'disableModelInvocation') === true && (
												<Badge
													variant="outline"
													className="h-4 rounded-md border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-300"
												>
													{t('settings.skills.modelHidden')}
												</Badge>
											)}
										</span>
									</ItemTitle>
									<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground">
										{skill.manifest.description || t('settings.skills.noDescription')}
									</p>
								</ItemContent>
								<ItemActions className="ml-auto flex-none flex-wrap justify-end gap-1.5 sm:flex-nowrap">
									<Button variant="outline" size="xs" onClick={() => setSelectedSkill(skill)}>
										<Eye className="size-3" />
										{t('settings.skills.details')}
									</Button>
									<Button
										variant="outline"
										size="xs"
										onClick={() => void handleDownload(skill)}
										disabled={Boolean(downloadingId)}
									>
										<Download className="size-3" />
										{downloadingId === skill.id
											? t('settings.skills.downloading')
											: t('settings.skills.download')}
									</Button>
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

			<Dialog open={Boolean(selectedSkill)} onOpenChange={(open) => !open && setSelectedSkill(null)}>
				<DialogContent className="max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto sm:max-w-xl">
					{selectedSkill && (
						<>
							<DialogHeader>
								<DialogTitle className="flex min-w-0 items-center gap-2">
									<FileText className="size-4 shrink-0 text-muted-foreground" />
									<span className="truncate">{selectedSkill.manifest.name}</span>
								</DialogTitle>
								<DialogDescription>
									{selectedSkill.manifest.description || t('settings.skills.noDescription')}
								</DialogDescription>
							</DialogHeader>
							<dl className="grid gap-2 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]">
								<SkillDetail label={t('settings.skills.detailId')} value={selectedSkill.id} mono />
								<SkillDetail
									label={t('settings.skills.detailFormat')}
									value={selectedSkill.structure?.standard || t('settings.skills.none')}
								/>
								<SkillDetail label={t('settings.skills.detailVersion')} value={skillVersion(selectedSkill)} />
								<SkillDetail
									label={t('settings.skills.detailCategory')}
									value={selectedSkill.manifest.category || t('settings.skills.none')}
								/>
								<SkillDetail
									label={t('settings.skills.detailSafety')}
									value={selectedSkill.manifest.safetyLevel || t('settings.skills.none')}
								/>
								<SkillDetail
									label={t('settings.skills.detailVisibility')}
									value={selectedSkill.manifest.visibility || t('settings.skills.none')}
								/>
								<SkillDetail
									label={t('settings.skills.detailAuthor')}
									value={selectedSkill.manifest.author || t('settings.skills.none')}
								/>
								<SkillDetail
									label={t('settings.skills.detailTools')}
									value={compactList(
										[
											...(selectedSkill.manifest.requiredTools ?? []),
											...(selectedSkill.manifest.allowedTools ?? []),
										],
										t('settings.skills.none')
									)}
								/>
								<SkillDetail
									label={t('settings.skills.detailConnectors')}
									value={compactList(
										selectedSkill.manifest.requiredConnectors,
										t('settings.skills.none')
									)}
								/>
								<SkillDetail
									label={t('settings.skills.detailTags')}
									value={compactList(selectedSkill.manifest.tags, t('settings.skills.none'))}
								/>
								<SkillDetail
									label={t('settings.skills.detailModel')}
									value={
										metadataFlag(selectedSkill, 'disableModelInvocation') === true
											? t('settings.skills.modelHidden')
											: t('settings.skills.modelVisible')
									}
								/>
								<SkillDetail label={t('settings.skills.detailFolder')} value={selectedSkill.folderPath} mono />
								<SkillDetail
									label={t('settings.skills.detailSkillFile')}
									value={selectedSkill.skillPath || t('settings.skills.none')}
									mono
								/>
								{selectedSkill.diagnostics && selectedSkill.diagnostics.length > 0 && (
									<>
										<dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
											{t('settings.skills.detailDiagnostics')}
										</dt>
										<dd className="space-y-1 text-foreground">
											{selectedSkill.diagnostics.map((diagnostic) => (
												<div
													key={`${diagnostic.code}:${diagnostic.message}`}
													className="rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] leading-4"
												>
													<span className="font-medium">{diagnostic.code}</span>: {diagnostic.message}
												</div>
											))}
										</dd>
									</>
								)}
							</dl>
						</>
					)}
				</DialogContent>
			</Dialog>
		</SettingsPageShell>
	);
};

function SkillDetail({
	label,
	value,
	mono,
}: {
	readonly label: string;
	readonly value: string;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<>
			<dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
				{label}
			</dt>
			<dd className={mono ? 'break-all font-mono text-[11px] text-foreground' : 'break-words text-foreground'}>
				{value}
			</dd>
		</>
	);
}

export default SkillsPage;
