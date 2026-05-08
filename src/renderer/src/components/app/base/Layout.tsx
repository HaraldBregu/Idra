import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useWorkspaceListener } from '../../../hooks/use-workspace-listener';
import { useWorkspaceValidation } from '../../../hooks/use-workspace-validation';
import { useCreateWriting } from '../../../hooks/use-create-writing';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
	selectCurrentWorkspacePath,
	selectProjectName,
	selectWorkspaces,
} from '../../../store/workspace/selectors';
import {
	loadCurrentWorkspace,
	loadProjectName,
	listWorkspaces,
	selectWorkspace,
} from '../../../store/workspace/actions';
import { selectAllDocuments, documentAdded } from '../../../store/workspace';
import { TitleBar } from '../titlebar/TitleBar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarHeader,
	useSidebar,
	Sidebar,
} from '@/components/ui/Sidebar';
import { AppIconOpenWriter } from '..';
import {
	Settings,
	ChevronRight,
	Globe,
	Plus,
	Sun,
	Monitor,
	Moon,
	MoreHorizontal,
	Pencil,
	Trash2,
	Copy,
	GalleryVerticalEnd,
	EllipsisVertical,
	ArrowLeftRight,
} from 'lucide-react';
import { SidebarPageContainer, SidebarPageInset } from '../sidebar/Sidebar';
import { DeleteConfirmDialog } from '../dialogs/DeleteConfirmDialog';
import { CommandModalProvider, useCommandModal } from '../command-modals';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useAppActions } from '@/hooks/use-app-actions';
import { getShortcutLabel, ShortcutId, type Platform } from '../../../../../shared/shortcuts';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuGroup,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu';
import { useLanguageMode } from '@/hooks/use-language-mode';
import type { AppLanguage } from '@/contexts/AppContext';

interface LayoutProps {
	readonly children: React.ReactNode;
}

const ACCOUNT_MENU_ITEM_CLASS = 'gap-3 px-2 py-2';

const LANGUAGE_OPTIONS: readonly { value: AppLanguage; labelKey: string }[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

function Container({ children }: LayoutProps) {
	const { t } = useTranslation();
	const { toggleSidebar, open } = useSidebar();
	const { activeModal } = useCommandModal();
	const location = useLocation();
	const router = useRouter();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const handleNavigateBack = useCallback(() => router.history.back(), [router]);
	const handleNavigateForward = useCallback(() => router.history.forward(), [router]);
	const projectName = useAppSelector(selectProjectName);
	const currentWorkspacePath = useAppSelector(selectCurrentWorkspacePath);
	const workspaces = useAppSelector(selectWorkspaces);
	const themeMode = useThemeMode();
	const language = useLanguageMode();
	const { setTheme, setLanguage } = useAppActions();
	const shortcutPlatform: Platform =
		typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
			? 'mac'
			: typeof navigator !== 'undefined' && navigator.userAgent.includes('Win')
				? 'win'
				: 'linux';
	const newDocumentShortcutLabel = getShortcutLabel(ShortcutId.newDocument, shortcutPlatform);

	// Listen for workspace changes from main process and update Redux
	useWorkspaceListener();

	// Monitor workspace folder for external deletion and redirect to Welcome
	useWorkspaceValidation();

	// Load current workspace, project name, and the full workspaces list on mount
	useEffect(() => {
		dispatch(loadCurrentWorkspace()).then(() => {
			dispatch(loadProjectName());
		});
		dispatch(listWorkspaces());
	}, [dispatch]);

	const workspaceNameFromPathString = (path: string) => {
		const parts = path.split(/[/\\]/);
		return parts[parts.length - 1] || path;
	};

	const handleSelectWorkspace = useCallback(
		(path: string) => {
			if (path !== currentWorkspacePath) {
				dispatch(selectWorkspace(path));
			}
		},
		[dispatch, currentWorkspacePath]
	);

	const handleAddWorkspace = useCallback(() => {
		navigate({ to: '/' });
	}, [navigate]);

	// -------------------------------------------------------------------------
	// Documents list — sourced from Redux (loaded/watched at app startup)
	// -------------------------------------------------------------------------
	const documents = [...useAppSelector(selectAllDocuments)].sort(
		(a, b) => b.createdAt - a.createdAt
	);

	// -------------------------------------------------------------------------
	// New document handler — optimistic Redux update
	// -------------------------------------------------------------------------
	const handleDocumentCreated = useCallback(
		(result: { id: string }) => {
			dispatch(
				documentAdded({
					id: result.id,
					title: '',
					path: '',
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			);
		},
		[dispatch]
	);

	const { createWriting, isCreating: creatingWriting } = useCreateWriting({
		onCreated: handleDocumentCreated,
	});

	// -------------------------------------------------------------------------
	// Document deletion — Backspace on focused item or dropdown "Delete" action
	// -------------------------------------------------------------------------
	const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

	const requestDeleteDocument = useCallback((doc: { id: string; title: string }) => {
		setPendingDelete(doc);
	}, []);

	const handleDuplicateDocument = useCallback(
		async (doc: { id: string; title: string }) => {
			const original = await window.workspace.loadOutput({ type: 'documents', id: doc.id });
			if (!original) return;
			const duplicateTitle = doc.title ? `${doc.title} (Copy)` : '';
			const result = await window.workspace.saveOutput({
				type: 'documents',
				content: original.content,
				metadata: { title: duplicateTitle },
			});
			dispatch(
				documentAdded({
					id: result.id,
					title: duplicateTitle,
					path: result.path,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
			);
		},
		[dispatch]
	);

	const handleDocumentKeyDown = useCallback(
		(event: React.KeyboardEvent, doc: { id: string; title: string }) => {
			if (event.key === 'Backspace' || event.key === 'Delete') {
				event.preventDefault();
				event.stopPropagation();
				requestDeleteDocument(doc);
			}
		},
		[requestDeleteDocument]
	);

	const handleDocumentContextMenu = useCallback(
		async (event: React.MouseEvent, doc: { id: string; title: string }) => {
			event.preventDefault();
			event.stopPropagation();
			const action = await window.app.showContextMenu([
				{ id: 'rename', label: t('menu.rename', 'Rename') },
				{ id: 'duplicate', label: t('menu.duplicate', 'Duplicate') },
				{ id: 'delete', label: t('menu.delete', 'Delete'), destructive: true },
			]);
			if (action === 'delete') {
				requestDeleteDocument(doc);
			} else if (action === 'duplicate') {
				handleDuplicateDocument(doc);
			}
		},
		[requestDeleteDocument, handleDuplicateDocument, t]
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!pendingDelete) return;
		setPendingDelete(null);
		await window.workspace.deleteOutput({ type: 'documents', id: pendingDelete.id });
	}, [pendingDelete]);

	const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
		if (!open) setPendingDelete(null);
	}, []);

	useEffect(() => {
		if (typeof window.app?.onShortcut !== 'function') return;
		return window.app.onShortcut((id) => {
			if (id === ShortcutId.newDocument) {
				createWriting();
			}
		});
	}, [createWriting]);

	const displayWorkspaceName = projectName || t('appLayout.untitledWorkspace', 'Untitled workspace');
	const sidebarTitle = projectName || t('appLayout.untitledWorkspace', 'Untitled workspace');
	const isLandingPage = location.pathname === '/';
	const [profile, setProfile] = useState<{ firstName: string; lastName: string } | null>(null);
	useEffect(() => {
		let cancelled = false;
		window.app.getProfile().then((p) => {
			if (!cancelled) setProfile(p);
		}).catch(() => {});
		return () => { cancelled = true; };
	}, []);
	const footerUserFirstName = profile?.firstName ?? '';
	const footerUserLastName = profile?.lastName ?? '';
	const footerUserName = `${footerUserFirstName} ${footerUserLastName}`.trim()
		|| t('appLayout.unknownUser', 'User');
	const footerUserInitial = (footerUserFirstName || footerUserName).charAt(0).toUpperCase();

	const accountMenuItems = [
		{
			value: 'general',
			label: t('settings.tabs.general', 'General'),
			icon: Settings,
		},
		{
			value: 'workspace',
			label: t('settings.tabs.workspace', 'Workspace'),
			icon: GalleryVerticalEnd,
		},
		{
			value: 'editor',
			label: t('settings.tabs.editor', 'Editor'),
			icon: Pencil,
		},
		{
			value: 'system',
			label: t('settings.tabs.system', 'System'),
			icon: Monitor,
		},
	] as const;

	const handleAccountMenuValueChange = useCallback(
		(value: string) => {
			switch (value) {
				case 'general':
					navigate({ to: '/settings/general' });
					break;
				case 'workspace':
					navigate({ to: '/settings/workspace' });
					break;
				case 'editor':
					navigate({ to: '/settings/editor' });
					break;
				case 'system':
					navigate({ to: '/settings/system' });
					break;
				case 'changeWorkspace':
					navigate({ to: '/' });
					break;
				default:
					break;
			}
		},
		[navigate]
	);

	const handleLanguageChange = useCallback(
		(value: string) => {
			if (value === 'en' || value === 'it') {
				setLanguage(value);
			}
		},
		[setLanguage]
	);

	const handleThemeChange = useCallback(
		(value: string) => {
			if (value === 'light' || value === 'dark' || value === 'system') {
				setTheme(value);
			}
		},
		[setTheme]
	);

	return (
		<>
			<TitleBar
				title={displayWorkspaceName}
				onToggleSidebar={toggleSidebar}
				onNavigateBack={isLandingPage ? undefined : handleNavigateBack}
				onNavigateForward={isLandingPage ? undefined : handleNavigateForward}
				showSidebarToggles={false}
			/>

			<SidebarPageContainer>
				<Sidebar className="top-12 h-[calc(100svh-3rem)]">
					<SidebarHeader>
						<SidebarMenu>
							<SidebarMenuItem>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<SidebarMenuButton size="lg">
												<div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
													<GalleryVerticalEnd className="size-4" />
												</div>
												<div className="flex flex-col gap-1 leading-none">
													<span className="font-medium">Workspace</span>
													<span className="text-muted-foreground">{sidebarTitle}</span>
												</div>
											</SidebarMenuButton>
										}
									/>
									<DropdownMenuContent
										className="w-(--radix-dropdown-menu-trigger-width) min-w-72"
										side="top"
										align="end"
										sideOffset={4}
									>
										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-xs text-muted-foreground">
												{t('appLayout.workspaces', 'Workspaces')}
											</DropdownMenuLabel>
											{workspaces.map((workspace) => {
												const name = workspace.name || workspaceNameFromPathString(workspace.path);
												const isActive = workspace.path === currentWorkspacePath;
												return (
													<DropdownMenuItem
														key={workspace.id}
														onClick={() => handleSelectWorkspace(workspace.path)}
														className="gap-2 p-2"
													>
														<div className="flex size-6 items-center justify-center rounded-md border">
															<AppIconOpenWriter className="size-3.5 shrink-0" />
														</div>
														<span className={isActive ? 'font-medium' : ''}>{name}</span>
													</DropdownMenuItem>
												);
											})}
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuGroup>
											<DropdownMenuItem className="gap-2 p-2" onClick={handleAddWorkspace}>
												<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
													<Plus className="size-4" />
												</div>
												<div className="font-medium text-muted-foreground">
													{t('appLayout.addWorkspace', 'Add workspace')}
												</div>
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>

					{/* Nav */}
					<SidebarContent>
						{/* Home + New Document + Quick Actions */}
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu className="gap-1">
									<SidebarMenuItem>
										<SidebarMenuButton
											className="group/btn h-9 px-3 group-data-[collapsible=icon]:justify-center"
											onClick={createWriting}
											disabled={creatingWriting}
										>
											<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sidebar-accent transition-colors group-hover/btn:bg-sidebar-primary group-hover/btn:text-sidebar-primary-foreground">
												<Plus className="h-3.5 w-3.5" />
											</span>
											<span className="flex-1 truncate group-data-[collapsible=icon]:hidden">{t('sidebar.document', 'Document')}</span>
											<span className="text-sm text-muted-foreground/60 opacity-0 group-hover/btn:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden">
												{newDocumentShortcutLabel}
											</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						{/* Writings collapsible group — hidden when sidebar is collapsed */}
						{open && (
							<Collapsible defaultOpen className="py-0">
								<SidebarGroup className="py-0">
									<SidebarGroupLabel
										className="px-3"
										render={
											<CollapsibleTrigger className="group/label cursor-pointer select-none hover:text-sidebar-foreground transition-colors" />
										}
									>
										{t('sidebar.writings')}
										<ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/label:opacity-100 transition-all duration-200 group-data-[panel-open]/label:rotate-90" />
									</SidebarGroupLabel>
									<CollapsibleContent>
										<SidebarGroupContent>
											<SidebarMenu className="gap-1">
												{documents.map((w) => (
													<SidebarMenuItem key={w.id}>
														<SidebarMenuButton
															render={<Link to="/settings/assistant" />}
															className="h-9 px-3"
															isActive={false}
															onKeyDown={(event) =>
																handleDocumentKeyDown(event, { id: w.id, title: w.title })
															}
															onContextMenu={(event) =>
																handleDocumentContextMenu(event, { id: w.id, title: w.title })
															}
														>
															<span className="flex-1 truncate">
																{w.title || t('sidebar.untitledWriting')}
															</span>
														</SidebarMenuButton>
														<DropdownMenu>
															<DropdownMenuTrigger
																render={
																	<SidebarMenuAction
																		aria-label={t('sidebar.documentActions', 'Document actions')}
																		className="opacity-0 group-hover/menu-item:opacity-100 aria-expanded:opacity-100"
																	>
																		<MoreHorizontal />
																	</SidebarMenuAction>
																}
															/>
															<DropdownMenuContent side="right" align="start" className="w-44">
																<DropdownMenuItem>
																	<Pencil />
																	<span>{t('menu.rename', 'Rename')}</span>
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() =>
																		handleDuplicateDocument({ id: w.id, title: w.title })
																	}
																>
																	<Copy />
																	<span>{t('menu.duplicate', 'Duplicate')}</span>
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	variant="destructive"
																	onClick={() =>
																		requestDeleteDocument({ id: w.id, title: w.title })
																	}
																>
																	<Trash2 />
																	<span>{t('menu.delete', 'Delete')}</span>
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</SidebarMenuItem>
												))}
											</SidebarMenu>
										</SidebarGroupContent>
									</CollapsibleContent>
								</SidebarGroup>
							</Collapsible>
						)}

						<SidebarGroup className="mt-auto">
							<SidebarMenu className="gap-1">
								<SidebarMenuItem>
									<SidebarMenuButton
										render={<Link to="/settings" />}
										tooltip={t('appLayout.settings', 'Settings')}
										className="group/btn h-9 px-3"
										isActive={location.pathname.startsWith('/settings')}
									>
										<Settings />
										<span>{t('appLayout.settings', 'Settings')}</span>
										<ChevronRight className="ml-auto" />
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroup>
					</SidebarContent>

					<SidebarFooter>
						<SidebarMenu>
							<SidebarMenuItem>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<SidebarMenuButton
												size="lg"
												className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
											>
												<Avatar className="h-8 w-8 rounded-full">
													<AvatarImage alt={footerUserName} />
													<AvatarFallback className="rounded-full">
														{footerUserInitial}
													</AvatarFallback>
												</Avatar>
												<div className="grid flex-1 text-left text-sm leading-tight">
													<span className="truncate font-medium">{footerUserName}</span>
												</div>
												<EllipsisVertical className="ml-auto size-4" />
											</SidebarMenuButton>
										}
									/>
									<DropdownMenuContent
										className="w-(--radix-dropdown-menu-trigger-width) min-w-72"
										side="right"
										align="end"
										sideOffset={4}
									>
										<DropdownMenuGroup>
											<DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
												<span className="text-sm font-medium">{footerUserName}</span>
											</DropdownMenuLabel>
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuGroup className="space-y-1">
											{accountMenuItems.map(({ value, label, icon: Icon }) => (
												<DropdownMenuItem
													key={value}
													className={ACCOUNT_MENU_ITEM_CLASS}
													onClick={() => handleAccountMenuValueChange(value)}
												>
													<Icon />
													<span className="flex-1">{label}</span>
												</DropdownMenuItem>
											))}
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuSub>
											<DropdownMenuSubTrigger className={ACCOUNT_MENU_ITEM_CLASS}>
												<Sun />
												<span className="flex-1">{t('settings.theme.title')}</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="min-w-40 p-1">
												<DropdownMenuGroup className="space-y-1">
													<DropdownMenuLabel className="text-xs text-muted-foreground">
														{t('settings.theme.title')}
													</DropdownMenuLabel>
													<DropdownMenuRadioGroup
														value={themeMode}
														onValueChange={handleThemeChange}
														className="space-y-1"
													>
														<DropdownMenuRadioItem
															value="light"
															className={ACCOUNT_MENU_ITEM_CLASS}
														>
															<Sun />
															<span className="flex-1">{t('settings.theme.light', 'Light')}</span>
														</DropdownMenuRadioItem>
														<DropdownMenuRadioItem
															value="system"
															className={ACCOUNT_MENU_ITEM_CLASS}
														>
															<Monitor />
															<span className="flex-1">{t('settings.theme.system', 'System')}</span>
														</DropdownMenuRadioItem>
														<DropdownMenuRadioItem value="dark" className={ACCOUNT_MENU_ITEM_CLASS}>
															<Moon />
															<span className="flex-1">{t('settings.theme.dark', 'Dark')}</span>
														</DropdownMenuRadioItem>
													</DropdownMenuRadioGroup>
												</DropdownMenuGroup>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuSeparator />
										<DropdownMenuSub>
											<DropdownMenuSubTrigger className={ACCOUNT_MENU_ITEM_CLASS}>
												<Globe />
												<span className="flex-1">{t('menu.language', 'Language')}</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="min-w-40 p-1">
												<DropdownMenuGroup className="space-y-1">
													<DropdownMenuLabel className="text-xs text-muted-foreground">
														{t('menu.language', 'Language')}
													</DropdownMenuLabel>
													<DropdownMenuRadioGroup
														value={language}
														onValueChange={handleLanguageChange}
														className="space-y-1"
													>
														{LANGUAGE_OPTIONS.map((option) => (
															<DropdownMenuRadioItem
																key={option.value}
																value={option.value}
																className={ACCOUNT_MENU_ITEM_CLASS}
															>
																{t(option.labelKey)}
															</DropdownMenuRadioItem>
														))}
													</DropdownMenuRadioGroup>
												</DropdownMenuGroup>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
										<DropdownMenuSeparator />
										<DropdownMenuGroup>
											<DropdownMenuItem
												className={ACCOUNT_MENU_ITEM_CLASS}
												onClick={() => handleAccountMenuValueChange('changeWorkspace')}
											>
												<ArrowLeftRight />
												<span className="flex-1">
													{t('appLayout.changeWorkspace', 'Change workspace')}
												</span>
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarFooter>
				</Sidebar>

				<SidebarPageInset>{children}</SidebarPageInset>
			</SidebarPageContainer>

			<DeleteConfirmDialog
				open={pendingDelete !== null}
				onOpenChange={handleDeleteDialogOpenChange}
				title={t('sidebar.deleteDocumentTitle', 'Delete document?')}
				description={t('sidebar.deleteDocumentDescription', {
					defaultValue:
						'"{{title}}" will be permanently removed from this workspace. This action cannot be undone.',
					title: pendingDelete?.title || t('sidebar.untitledWriting'),
				})}
				onConfirm={handleConfirmDelete}
			/>
		</>
	);
}

export function Layout({ children }: LayoutProps) {
	return (
		<SidebarProvider
			className="flex-col flex-1 min-h-0 flex h-screen min-w-200 overflow-x-hidden"
			style={{ '--sidebar-width': '18rem' } as React.CSSProperties}
		>
			<CommandModalProvider>
				<Container>{children}</Container>
			</CommandModalProvider>
		</SidebarProvider>
	);
}
