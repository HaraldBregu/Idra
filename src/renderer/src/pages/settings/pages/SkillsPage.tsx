import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertTriangle,
	FolderInput,
	RefreshCw,
	Sparkles,
	Trash2,
	type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SkillInfo } from '../../../../../shared/skills';

function Row({
	icon: Icon,
	title,
	description,
	media,
	children,
	contentClassName,
	actionClassName,
}: {
	readonly icon?: LucideIcon;
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly media?: ReactNode;
	readonly children?: ReactNode;
	readonly contentClassName?: string;
	readonly actionClassName?: string;
}): React.JSX.Element {
	return (
		<div className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0">
			<div className={cn('flex min-w-0 items-start gap-2', contentClassName)}>
				{media ??
					(Icon && (
						<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
							<Icon className="size-3.5" />
						</div>
					))}
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-medium leading-tight text-foreground">{title}</div>
					{description && (
						<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children && (
				<div className={cn('flex min-w-0 flex-wrap items-center justify-end gap-1.5', actionClassName)}>
					{children}
				</div>
			)}
		</div>
	);
}

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
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">
						{t('settings.tabs.skills')}
					</h1>
					<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
						{t('settings.skills.description')}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
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
				</div>
			</header>

			{errorMessage && (
				<div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
					<span className="min-w-0">{errorMessage}</span>
				</div>
			)}

			<section className="flex flex-col gap-2">
				<div className="flex flex-wrap items-start justify-between gap-2 px-0.5">
					<div className="min-w-0">
						<h2 className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
							{t('settings.skills.title')}
						</h2>
						{skillsRoot && (
							<p className="mt-0.5 max-w-2xl text-xs leading-snug text-muted-foreground">
								{skillsRoot}
							</p>
						)}
					</div>
				</div>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						{loading ? (
							<div className="grid gap-2 p-2.5">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-5/6" />
							</div>
						) : skills.length === 0 ? (
							<Empty className="min-h-28 gap-3 border-0 p-4">
								<EmptyHeader className="gap-1.5">
									<EmptyMedia variant="icon" className="mb-1 size-7">
										<Sparkles className="size-3.5" />
									</EmptyMedia>
									<EmptyTitle className="text-[13px]">{t('settings.skills.empty')}</EmptyTitle>
									<EmptyDescription className="text-xs leading-snug">
										{t('settings.skills.emptyDescription')}
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						) : (
							skills.map((skill) => (
								<Row
									key={skill.id}
									title={
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{skill.manifest.name}</span>
											<Badge
												variant="outline"
												className="h-4 rounded-md bg-muted/40 py-0 font-mono text-[10px] text-muted-foreground"
											>
												{skill.id}
											</Badge>
										</span>
									}
									description={skill.manifest.description ?? skill.folderPath}
									media={
										<div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/60">
											<Sparkles className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
										</div>
									}
									contentClassName="items-center"
									actionClassName="flex-nowrap"
								>
									<Button variant="destructive" size="xs" onClick={() => handleDelete(skill)}>
										<Trash2 className="size-3" />
										{t('settings.skills.delete')}
									</Button>
								</Row>
							))
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default SkillsPage;
