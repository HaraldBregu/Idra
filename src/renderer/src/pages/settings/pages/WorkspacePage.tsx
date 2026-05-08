import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import type { ProjectWorkspaceInfo } from '../../../../../shared/types';
import { Input } from '@/components/ui/Input';

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

type EditingField = 'name' | 'description' | null;

const WorkspacePage: React.FC = () => {
	const { t } = useTranslation();

	const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
	const [projectInfo, setProjectInfo] = useState<ProjectWorkspaceInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);

	const [editingField, setEditingField] = useState<EditingField>(null);
	const [draft, setDraft] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const descriptionInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let cancelled = false;

		Promise.all([window.workspace.getCurrent(), window.workspace.getProjectInfo()])
			.then(([workspace, info]) => {
				if (cancelled) return;
				setCurrentWorkspace(workspace);
				setProjectInfo(info);
			})
			.catch(() => {
				if (!cancelled) setLoadError(true);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleStartEdit = useCallback(
		(field: 'name' | 'description') => {
			if (!projectInfo) return;
			setSaveError(false);
			setEditingField(field);
			setDraft(field === 'name' ? projectInfo.name : projectInfo.description);
		},
		[projectInfo]
	);

	const handleCancel = useCallback(() => {
		setEditingField(null);
		setDraft('');
		setSaveError(false);
	}, []);

	const handleCommit = useCallback(() => {
		if (!editingField || !projectInfo) return;

		const trimmed = draft.trim();
		const current = editingField === 'name' ? projectInfo.name : projectInfo.description;

		if (trimmed === (current ?? '')) {
			setEditingField(null);
			return;
		}

		setIsSaving(true);

		const apiCall =
			editingField === 'name'
				? window.workspace.updateProjectName(trimmed)
				: window.workspace.updateProjectDescription(trimmed);

		apiCall
			.then((updated) => {
				setProjectInfo(updated);
				setEditingField(null);
			})
			.catch(() => {
				setSaveError(true);
			})
			.finally(() => {
				setIsSaving(false);
			});
	}, [editingField, draft, projectInfo]);

	const handleEditKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				handleCommit();
			} else if (e.key === 'Escape') {
				handleCancel();
			}
		},
		[handleCommit, handleCancel]
	);

	useEffect(() => {
		if (editingField === 'description' && descriptionInputRef.current) {
			descriptionInputRef.current.focus();
			const len = descriptionInputRef.current.value.length;
			descriptionInputRef.current.setSelectionRange(len, len);
		}
	}, [editingField]);

	return (
		<div className="w-full max-w-2xl" aria-busy={isSaving}>
			<h1 className="text-lg font-normal mb-6">{t('workspacePage.title')}</h1>

			{loadError && (
				<p className="text-sm text-destructive mb-4" role="alert">
					{t('workspacePage.loadError')}
				</p>
			)}

			{saveError && (
				<p className="text-sm text-destructive mb-4" role="alert">
					{t('workspacePage.saveError')}
				</p>
			)}

			<div className="pt-6 pb-2 first:pt-0">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('workspacePage.sections.baseInfo')}
				</h2>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{t('workspacePage.path')}</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('workspacePage.pathDescription')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<span
							className="font-mono text-xs truncate max-w-xs inline-block text-muted-foreground"
							title={currentWorkspace ?? t('workspacePage.notSet')}
							aria-live="polite"
							aria-atomic="true"
						>
							{isLoading
								? t('workspacePage.loading')
								: (currentWorkspace ?? t('workspacePage.notSet'))}
						</span>
						{!isLoading && currentWorkspace && (
							<button
								type="button"
								onClick={() => window.workspace.openWorkspaceFolder()}
								className="shrink-0 rounded p-1 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
								aria-label={t('common.openFolder')}
								title={t('common.openFolder')}
							>
								<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
							</button>
						)}
					</div>
				</div>

				{!isLoading && currentWorkspace && projectInfo && (
					<>
						<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
							<div className="flex flex-1 flex-col gap-1">
								<h3 className="text-sm leading-snug font-medium">{t('workspacePage.name')}</h3>
								<p className="text-sm leading-normal text-muted-foreground">
									{t('workspacePage.nameDescription')}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{editingField === 'name' ? (
									<Input
										autoFocus
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										onBlur={handleCommit}
										onKeyDown={handleEditKeyDown}
										disabled={isSaving}
										className="h-7 px-2 py-0 text-sm w-56"
										aria-label={t('workspacePage.namePlaceholder')}
									/>
								) : (
									<button
										type="button"
										onClick={() => handleStartEdit('name')}
										className="text-sm truncate max-w-[14rem] text-right hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
										title={projectInfo.name || t('workspacePage.namePlaceholder')}
										aria-label={`${t('common.edit')} ${t('workspacePage.name')}: ${projectInfo.name || t('workspacePage.namePlaceholder')}`}
									>
										{projectInfo.name || (
											<span className="text-muted-foreground italic">
												{t('workspacePage.namePlaceholder')}
											</span>
										)}
									</button>
								)}
							</div>
						</div>

						<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
							<div className="flex flex-1 flex-col gap-1">
								<h3 className="text-sm leading-snug font-medium">
									{t('workspacePage.descriptionLabel')}
								</h3>
								<p className="text-sm leading-normal text-muted-foreground">
									{t('workspacePage.descriptionDescription')}
								</p>
							</div>
							<div className="flex items-center gap-2">
								{editingField === 'description' ? (
									<Input
										ref={descriptionInputRef}
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										onBlur={handleCommit}
										onKeyDown={handleEditKeyDown}
										disabled={isSaving}
										className="h-7 px-2 py-0 text-sm w-72"
										aria-label={t('workspacePage.descriptionPlaceholder')}
									/>
								) : (
									<button
										type="button"
										onClick={() => handleStartEdit('description')}
										className="text-sm truncate max-w-[18rem] text-right hover:text-foreground hover:underline underline-offset-2 transition-colors cursor-text"
										title={projectInfo.description || t('workspacePage.descriptionPlaceholder')}
										aria-label={`${t('common.edit')} ${t('workspacePage.descriptionLabel')}: ${projectInfo.description || t('workspacePage.descriptionPlaceholder')}`}
									>
										{projectInfo.description || (
											<span className="text-muted-foreground italic">
												{t('workspacePage.descriptionPlaceholder')}
											</span>
										)}
									</button>
								)}
							</div>
						</div>

						<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
							<div className="flex flex-1 flex-col gap-1">
								<h3 className="text-sm leading-snug font-medium">{t('workspacePage.createdAt')}</h3>
							</div>
							<span className="text-sm text-muted-foreground">{formatDate(projectInfo.createdAt)}</span>
						</div>

						<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
							<div className="flex flex-1 flex-col gap-1">
								<h3 className="text-sm leading-snug font-medium">{t('workspacePage.updatedAt')}</h3>
							</div>
							<span className="text-sm text-muted-foreground">{formatDate(projectInfo.updatedAt)}</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default WorkspacePage;
