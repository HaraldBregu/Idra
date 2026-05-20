import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Download, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { SkillInfo } from '../../../../../../../shared/skills';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';

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

const SkillDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { skillId } = useParams<{ skillId: string }>();
	const decodedSkillId = decodeURIComponent(skillId ?? '');
	const [skill, setSkill] = useState<SkillInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');

	const loadSkill = useCallback(async (): Promise<void> => {
		setLoading(true);
		setErrorMessage('');
		try {
			const list = await window.skills.list();
			setSkill(list.find((item) => item.id === decodedSkillId) ?? null);
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.skills.loadError')));
			setSkill(null);
		} finally {
			setLoading(false);
		}
	}, [decodedSkillId, t]);

	useEffect(() => {
		void loadSkill();
	}, [loadSkill]);

	const handleDownload = useCallback(async (): Promise<void> => {
		if (!skill) return;
		setDownloading(true);
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
			setDownloading(false);
		}
	}, [skill, t]);

	const handleDelete = useCallback(async (): Promise<void> => {
		if (!skill) return;
		const message = t('settings.skills.confirmDelete', { name: skill.manifest.name });
		if (!window.confirm(message)) return;

		setDeleting(true);
		setErrorMessage('');
		setSuccessMessage('');
		try {
			await window.skills.delete(skill.id);
			navigate('/settings/skills');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.skills.deleteError')));
		} finally {
			setDeleting(false);
		}
	}, [navigate, skill, t]);

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.skills.details')} />
				<SettingsPanel>
					<SettingsLoadingRows rows={3} />
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (!skill) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.skills.details')} />
				{errorMessage && (
					<SettingsNotice variant="destructive" icon={AlertTriangle}>
						{errorMessage}
					</SettingsNotice>
				)}
				<SettingsPanel>
					<SettingsEmptyState
						icon={Sparkles}
						title={decodedSkillId || t('settings.skills.empty')}
						description={t('settings.skills.emptyDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={skill.manifest.name}
				description={skill.manifest.description || t('settings.skills.noDescription')}
				action={
					<div className="flex flex-wrap items-center gap-1.5">
						<Button
							variant="outline"
							size="xs"
							onClick={() => void handleDownload()}
							disabled={downloading || deleting}
						>
							<Download className="size-3" />
							{downloading ? t('settings.skills.downloading') : t('settings.skills.download')}
						</Button>
						<Button
							variant="destructive"
							size="xs"
							onClick={() => void handleDelete()}
							disabled={downloading || deleting}
						>
							<Trash2 className="size-3" />
							{t('settings.skills.delete')}
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

			<SettingsSection title={t('settings.skills.details')}>
				<SettingsPanel>
					<SkillDetail label={t('settings.skills.detailId')} value={skill.id} mono />
					<SkillDetail
						label={t('settings.skills.detailFormat')}
						value={skill.structure?.standard || t('settings.skills.none')}
					/>
					<SkillDetail label={t('settings.skills.detailVersion')} value={skillVersion(skill)} />
					<SkillDetail
						label={t('settings.skills.detailCategory')}
						value={skill.manifest.category || t('settings.skills.none')}
					/>
					<SkillDetail
						label={t('settings.skills.detailSafety')}
						value={skill.manifest.safetyLevel || t('settings.skills.none')}
					/>
					<SkillDetail
						label={t('settings.skills.detailVisibility')}
						value={skill.manifest.visibility || t('settings.skills.none')}
					/>
					<SkillDetail
						label={t('settings.skills.detailAuthor')}
						value={skill.manifest.author || t('settings.skills.none')}
					/>
					<SkillDetail
						label={t('settings.skills.detailTools')}
						value={compactList(
							[
								...(skill.manifest.requiredTools ?? []),
								...(skill.manifest.allowedTools ?? []),
							],
							t('settings.skills.none')
						)}
					/>
					<SkillDetail
						label={t('settings.skills.detailConnectors')}
						value={compactList(skill.manifest.requiredConnectors, t('settings.skills.none'))}
					/>
					<SkillDetail
						label={t('settings.skills.detailTags')}
						value={compactList(skill.manifest.tags, t('settings.skills.none'))}
					/>
					<SkillDetail
						label={t('settings.skills.detailModel')}
						value={
							metadataFlag(skill, 'disableModelInvocation') === true
								? t('settings.skills.modelHidden')
								: t('settings.skills.modelVisible')
						}
					/>
					<SkillDetail label={t('settings.skills.detailFolder')} value={skill.folderPath} mono />
					<SkillDetail
						label={t('settings.skills.detailSkillFile')}
						value={skill.skillPath || t('settings.skills.none')}
						mono
					/>
				</SettingsPanel>
			</SettingsSection>

			{skill.diagnostics && skill.diagnostics.length > 0 && (
				<SettingsSection title={t('settings.skills.detailDiagnostics')}>
					<SettingsPanel>
						{skill.diagnostics.map((diagnostic) => (
							<Item
								key={`${diagnostic.code}:${diagnostic.message}`}
								variant="outline"
								size="md"
								className="border-b border-border/60 last:border-b-0"
							>
								<ItemContent className="min-w-0 flex-col items-start gap-1">
									<ItemTitle className="max-w-full truncate">{diagnostic.code}</ItemTitle>
									<p className="text-[11px] leading-4 text-muted-foreground">
										{diagnostic.message}
									</p>
								</ItemContent>
							</Item>
						))}
					</SettingsPanel>
				</SettingsSection>
			)}
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
		<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
			<ItemContent className="min-w-0">
				<ItemTitle>{label}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto min-w-0 flex-none justify-end">
				<span
					className={
						mono
							? 'max-w-md break-all text-right font-mono text-[11px] text-foreground'
							: 'max-w-md break-words text-right text-xs text-foreground'
					}
				>
					{value}
				</span>
			</ItemActions>
		</Item>
	);
}

export default SkillDetailsPage;
