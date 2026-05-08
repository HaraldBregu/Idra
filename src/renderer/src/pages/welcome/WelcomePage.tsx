import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Clock, Plus, X, AlertTriangle } from 'lucide-react';
import type { WorkspaceInfo } from '../../../../shared/types';
import { AppIconOpenWriter } from '@/components/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { H4, Muted, Small } from '@/components/ui/Typography';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { TitleBar } from '@/components/app/titlebar/TitleBar';
import {
	useWorkspaceDeletionReason,
	useClearDeletionReason,
} from '@/hooks/use-workspace-validation';

interface WelcomePageProps {}

const WelcomePage: React.FC<WelcomePageProps> = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const deletionReason = useWorkspaceDeletionReason();
	const clearDeletion = useClearDeletionReason();

	const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		window.workspace
			.list()
			.then((items) => {
				if (!cancelled) {
					setWorkspaces(items);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setWorkspaces([]);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const openCreateDialog = useCallback(() => {
		setName('');
		setDescription('');
		setSubmitError(null);
		setCreateOpen(true);
	}, []);

	const handleCreate = useCallback(
		async (event: React.FormEvent) => {
			event.preventDefault();
			const trimmedName = name.trim();
			if (!trimmedName) {
				setSubmitError(t('welcome.workspaceNamePlaceholder'));
				return;
			}
			setSubmitting(true);
			setSubmitError(null);
			try {
				const workspace = await window.workspace.create({
					name: trimmedName,
					description: description.trim(),
				});
				await window.workspace.setCurrent(workspace.path);
				setWorkspaces((current) => [workspace, ...current.filter((item) => item.id !== workspace.id)]);
				clearDeletion();
				setCreateOpen(false);
				navigate({ to: '/settings/assistant' });
			} catch (err) {
				setSubmitError(err instanceof Error ? err.message : String(err));
			} finally {
				setSubmitting(false);
			}
		},
		[name, description, navigate, t, clearDeletion]
	);

	const handleOpenWorkspace = useCallback(
		async (path: string) => {
			try {
				await window.workspace.setCurrent(path);
				clearDeletion();
				navigate({ to: '/settings/assistant' });
			} catch (error) {
				console.error('Failed to open workspace:', error);
			}
		},
		[navigate, clearDeletion]
	);

	const formatRelativeTime = (timestamp: number) => {
		if (!timestamp) return '';
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		if (days === 1) return 'yesterday';
		if (days < 7) return `${days}d ago`;
		return `${Math.floor(days / 7)}w ago`;
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			<TitleBar title="OpenWriter" />

			{deletionReason && (
				<div className="mx-8 mt-4 mb-0 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
					<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
					<p className="flex-1 text-sm text-foreground">
						{deletionReason === 'inaccessible'
							? t('workspace.inaccessibleBanner')
							: t('workspace.deletedBanner')}
					</p>
					<button
						onClick={clearDeletion}
						aria-label={t('common.close')}
						className="h-6 w-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
					>
						<X className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
					</button>
				</div>
			)}

			<div className="flex flex-col items-center flex-1 px-8 py-12 overflow-y-auto">
				<div className="flex flex-col items-center mb-8">
					<AppIconOpenWriter
						className="mb-3 text-foreground"
						style={{
							width: 'clamp(48px, min(8vw, 8vh), 72px)',
							height: 'clamp(48px, min(8vw, 8vh), 72px)',
						}}
						aria-label={t('appTitle')}
						role="img"
					/>
					<H4 className="mb-1 text-foreground">{t('appTitle')}</H4>
					<Muted className="text-center max-w-xs leading-relaxed">
						{t('welcome.tagline')}
					</Muted>
					<Small className="mt-2 font-normal text-muted-foreground">
						{t('welcome.freePlan')} &bull;{' '}
						<span className="text-primary cursor-pointer hover:underline">
							{t('welcome.upgradeToPro')}
						</span>
					</Small>
				</div>

				<div className="w-full max-w-2xl mb-8">
					<div className="rounded-xl border border-border p-6 flex items-center justify-between gap-6">
						<div className="flex flex-col gap-2">
							<H4 className="text-foreground">{t('welcome.createWorkspace')}</H4>
							<Muted>{t('welcome.createWorkspaceDescription')}</Muted>
						</div>

						<Button
							className="h-14 px-6 flex items-center gap-3 rounded-lg shrink-0"
							onClick={openCreateDialog}
						>
							<Plus className="h-5 w-5" />
							<span className="text-sm font-medium">{t('welcome.create')}</span>
						</Button>
					</div>
				</div>

				<div className="w-full max-w-2xl flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-3">
						<Small className="uppercase tracking-widest text-muted-foreground">
							{t('welcome.yourWorkspaces')}
						</Small>
						{workspaces.length > 5 && (
							<Small className="font-normal text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
								{t('welcome.viewAll')}
							</Small>
						)}
					</div>

					{workspaces.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
							<Muted>{t('welcome.noWorkspaces')}</Muted>
						</div>
					) : (
						<div className="rounded-xl border border-border overflow-y-auto max-h-96">
							{workspaces.slice(0, 5).map((workspace, index) => {
								const displayName = workspace.name || workspace.id;
								return (
									<button
										key={workspace.id}
										onClick={() => handleOpenWorkspace(workspace.path)}
										className={`
                      flex items-center justify-between w-full px-4 py-3 text-left
                      transition-colors hover:bg-accent
                      ${index !== 0 ? 'border-t border-border' : ''}
                    `}
									>
										<div className="flex items-center gap-4 flex-1 min-w-0">
											<div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
												<FolderOpen className="h-4 w-4 text-primary" />
											</div>

											<div className="flex flex-col items-start min-w-0">
												<span className="text-sm font-medium truncate text-foreground text-left">
													{displayName}
												</span>
												{workspace.description && (
													<span className="text-xs truncate mt-0.5 text-muted-foreground text-left">
														{workspace.description}
													</span>
												)}
											</div>
										</div>

										{workspace.lastOpened > 0 && (
											<div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-3">
												<Clock className="h-3 w-3" />
												<span>{formatRelativeTime(workspace.lastOpened)}</span>
											</div>
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>
			</div>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<form onSubmit={handleCreate}>
						<DialogHeader>
							<DialogTitle>{t('welcome.createWorkspace')}</DialogTitle>
							<DialogDescription>{t('welcome.createWorkspaceDescription')}</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="workspace-name">{t('welcome.workspaceName')}</Label>
								<Input
									id="workspace-name"
									autoFocus
									value={name}
									placeholder={t('welcome.workspaceNamePlaceholder')}
									onChange={(e) => setName(e.target.value)}
									disabled={submitting}
									required
									maxLength={255}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="workspace-description">{t('welcome.workspaceDescription')}</Label>
								<Textarea
									id="workspace-description"
									value={description}
									placeholder={t('welcome.workspaceDescriptionPlaceholder')}
									onChange={(e) => setDescription(e.target.value)}
									disabled={submitting}
									rows={3}
								/>
							</div>
							{submitError && <p className="text-xs text-destructive">{submitError}</p>}
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
								disabled={submitting}
							>
								{t('welcome.cancel')}
							</Button>
							<Button type="submit" disabled={submitting || !name.trim()}>
								{t('welcome.create')}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default WelcomePage;
