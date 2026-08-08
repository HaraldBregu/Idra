import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

import {
	agent,
	app,
	isFriday,
	win,
	workspaceFileType,
	type AppThemeData,
	type WorkspaceFileKind,
	type WorkspaceTreeEntry,
} from '@friday/sdk';
import { AppSidebar } from '@/components/app-sidebar';
import { WorkspaceViewer } from '@/components/workspace-viewer';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Sidebar, SidebarContent, SidebarResizeHandle } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { showNativeContextMenu } from '@/lib/menu';

const fallbackTheme: AppThemeData = {
	themeMode: 'light',
	isDark: false,
	colors: {},
};
const sidebarMinWidth = 200;
const sidebarMaxWidth = 360;
const sidebarDefaultWidth = 240;

export default function App() {
	const [theme, setTheme] = useState<AppThemeData>(fallbackTheme);
	const [workspaceLocation, setWorkspaceLocation] = useState('');
	const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceTreeEntry[]>([]);
	const [workspaceLoading, setWorkspaceLoading] = useState(false);
	const [workspaceError, setWorkspaceError] = useState('');
	const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string | null>(null);
	const [selectedKind, setSelectedKind] = useState<WorkspaceFileKind | null>(null);
	const [selectedContent, setSelectedContent] = useState('');
	const [selectedSavedContent, setSelectedSavedContent] = useState('');
	const [selectedMediaUrl, setSelectedMediaUrl] = useState('');
	const [selectedLoading, setSelectedLoading] = useState(false);
	const [selectedError, setSelectedError] = useState('');
	const [selectedSaving, setSelectedSaving] = useState(false);
	const [selectedSaveError, setSelectedSaveError] = useState('');
	const [deleteTarget, setDeleteTarget] = useState<WorkspaceTreeEntry | null>(null);
	const [deleteError, setDeleteError] = useState('');
	const [deleting, setDeleting] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(sidebarDefaultWidth);
	const selectedPathRef = useRef<string | null>(null);
	const selectedContentRef = useRef('');
	const saveInFlightRef = useRef<Promise<boolean> | null>(null);
	const saveSnapshotRef = useRef<{ filePath: string; content: string } | null>(null);
	const closeAfterSaveRef = useRef(false);
	const allowCloseRef = useRef(false);
	const deletingPathRef = useRef<string | null>(null);
	const selectionRequestRef = useRef(0);
	const selectedDirty = selectedKind === 'markdown' && selectedContent !== selectedSavedContent;
	useEffect(() => {
		if (!isFriday()) return;

		let active = true;

		app.getThemeData()
			.then((themeData) => {
				if (active) setTheme(themeData);
			})
			.catch(() => undefined);

		const unsubscribe = app.onThemeModeChanged((themeData) => {
			if (active) setTheme(themeData);
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle('dark', theme.isDark);
		for (const [name, value] of Object.entries(theme.colors)) {
			root.style.setProperty(`--${name}`, value);
		}
	}, [theme]);

	useEffect(() => {
		if (!isFriday()) return;

		let active = true;
		setWorkspaceLoading(true);
		setWorkspaceError('');

		Promise.all([agent.getWorkspaceLocation(), agent.listWorkspaceFiles()])
			.then(([location, files]) => {
				if (!active) return;
				setWorkspaceLocation(location);
				setWorkspaceFiles(files);
			})
			.catch((error) => {
				if (active) setWorkspaceError(error instanceof Error ? error.message : 'Unable to load workspace.');
			})
			.finally(() => {
				if (active) setWorkspaceLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const saveWorkspaceMarkdown = useCallback(async function saveWorkspaceMarkdown(
		filePath = selectedPathRef.current,
		content = selectedContent
	): Promise<boolean> {
		if (!filePath || selectedKind !== 'markdown' || !isFriday() || deletingPathRef.current === filePath) {
			return false;
		}
		const pendingSave = saveInFlightRef.current;
		if (pendingSave) {
			const pendingSnapshot = saveSnapshotRef.current;
			if (pendingSnapshot?.filePath === filePath && pendingSnapshot.content === content) {
				return pendingSave;
			}
			await pendingSave;
			return saveWorkspaceMarkdown(filePath, content);
		}

		setSelectedSaving(true);
		setSelectedSaveError('');
		saveSnapshotRef.current = { filePath, content };
		const operation = Promise.resolve()
			.then(() => agent.writeWorkspaceMarkdown(filePath, content))
			.then(() => {
				if (selectedPathRef.current === filePath) setSelectedSavedContent(content);
				return true;
			})
			.catch((error) => {
				if (selectedPathRef.current === filePath) {
					setSelectedSaveError(
						error instanceof Error ? error.message : 'Unable to save the Markdown file.'
					);
				}
				return false;
			})
			.finally(() => {
				saveInFlightRef.current = null;
				saveSnapshotRef.current = null;
				if (selectedPathRef.current === filePath) setSelectedSaving(false);
			});
		saveInFlightRef.current = operation;
		return operation;
	}, [selectedContent, selectedKind]);

	const saveLatestWorkspaceMarkdown = useCallback(async function saveLatestWorkspaceMarkdown(
		filePath = selectedPathRef.current
	): Promise<boolean> {
		if (!filePath) return false;
		let content = selectedContentRef.current;
		while (selectedPathRef.current === filePath) {
			const saved = await saveWorkspaceMarkdown(filePath, content);
			if (!saved) return false;
			const latestContent = selectedContentRef.current;
			if (latestContent === content) return true;
			content = latestContent;
		}
		return false;
	}, [saveWorkspaceMarkdown]);

	useEffect(() => {
		if (!selectedDirty || selectedSaving || selectedSaveError) return;
		const timeout = window.setTimeout(() => {
			void saveWorkspaceMarkdown(selectedPathRef.current, selectedContent);
		}, 700);
		return () => window.clearTimeout(timeout);
	}, [saveWorkspaceMarkdown, selectedContent, selectedDirty, selectedSaveError, selectedSaving]);

	useEffect(() => {
		if (!selectedDirty && !selectedSaving) return;
		const preventUnsavedClose = (event: BeforeUnloadEvent) => {
			if (allowCloseRef.current) return;
			if (selectedSaveError && !selectedSaving) {
				allowCloseRef.current = true;
				return;
			}
			event.preventDefault();
			event.returnValue = 'Changes are still being saved.';
			if (closeAfterSaveRef.current) return;
			closeAfterSaveRef.current = true;
			void saveLatestWorkspaceMarkdown(selectedPathRef.current).then((saved) => {
				closeAfterSaveRef.current = false;
				if (!saved) return;
				allowCloseRef.current = true;
				win.close();
			});
		};
		window.addEventListener('beforeunload', preventUnsavedClose);
		return () => window.removeEventListener('beforeunload', preventUnsavedClose);
	}, [saveLatestWorkspaceMarkdown, selectedDirty, selectedSaveError, selectedSaving]);

	async function selectWorkspaceEntry(entry: WorkspaceTreeEntry) {
		if (entry.type !== 'file') return;
		if (selectedKind === 'markdown' && (selectedContent !== selectedSavedContent || selectedSaving)) {
			const saved = await saveLatestWorkspaceMarkdown(selectedPathRef.current);
			if (!saved) return;
		}

		const requestId = selectionRequestRef.current + 1;
		selectionRequestRef.current = requestId;
		const kind = workspaceFileType(entry.path).kind;
		selectedPathRef.current = entry.path;
		setSelectedWorkspacePath(entry.path);
		setSelectedKind(kind);
		selectedContentRef.current = '';
		setSelectedContent('');
		setSelectedSavedContent('');
		setSelectedError('');
		setSelectedSaveError('');
		setSelectedMediaUrl('');

		if (kind === 'unsupported') {
			setSelectedLoading(false);
			return;
		}

		setSelectedLoading(true);
		try {
			if (['image', 'audio', 'video', 'pdf'].includes(kind)) {
				const url = new URL('local-resource://agent/');
				url.pathname = `/${entry.path.replaceAll('\\', '/')}`;
				setSelectedMediaUrl(url.toString());
			} else {
				const content = await agent.readWorkspaceFile(entry.path);
				if (selectionRequestRef.current !== requestId) return;
				selectedContentRef.current = content;
				setSelectedContent(content);
				setSelectedSavedContent(content);
			}
		} catch (error) {
			if (selectionRequestRef.current === requestId) {
				setSelectedError(error instanceof Error ? error.message : 'Unable to read file.');
			}
		} finally {
			if (selectionRequestRef.current === requestId) setSelectedLoading(false);
		}
	}

	async function confirmDeleteWorkspaceFile() {
		if (!deleteTarget || deleting || !isFriday()) return;
		const filePath = deleteTarget.path;
		deletingPathRef.current = filePath;
		setDeleting(true);
		setDeleteError('');
		try {
			if (saveInFlightRef.current) await saveInFlightRef.current;
			await agent.deleteWorkspaceFile(filePath);
			setWorkspaceFiles(await agent.listWorkspaceFiles());
			if (selectedPathRef.current === filePath) {
				selectionRequestRef.current += 1;
				selectedPathRef.current = null;
				selectedContentRef.current = '';
				setSelectedWorkspacePath(null);
				setSelectedKind(null);
				setSelectedContent('');
				setSelectedSavedContent('');
				setSelectedMediaUrl('');
				setSelectedError('');
				setSelectedSaveError('');
			}
			setDeleteTarget(null);
		} catch (error) {
			setDeleteError(error instanceof Error ? error.message : 'Unable to delete the file.');
		} finally {
			deletingPathRef.current = null;
			setDeleting(false);
		}
	}

	function startSidebarResize(event: PointerEvent<HTMLButtonElement>) {
		event.preventDefault();
		const startX = event.clientX;
		const startWidth = sidebarWidth;

		const resize = (moveEvent: globalThis.PointerEvent) => {
			const nextWidth = Math.min(
				sidebarMaxWidth,
				Math.max(sidebarMinWidth, startWidth + moveEvent.clientX - startX),
			);
			setSidebarWidth(nextWidth);
		};
		const stop = () => {
			window.removeEventListener('pointermove', resize);
			window.removeEventListener('pointerup', stop);
		};

		window.addEventListener('pointermove', resize);
		window.addEventListener('pointerup', stop, { once: true });
	}

	const sidebar = (
		<AppSidebar
			onDeleteRequest={(entry) => {
				setDeleteError('');
				setDeleteTarget(entry);
			}}
			onWorkspaceSelect={selectWorkspaceEntry}
			selectedWorkspacePath={selectedWorkspacePath}
			workspaceError={workspaceError}
			workspaceFiles={workspaceFiles}
			workspaceLoading={workspaceLoading}
			workspaceLocation={workspaceLocation}
		/>
	);

	return (
		<TooltipProvider delayDuration={400}>
			<div
				className="flex h-dvh min-h-[520px] overflow-hidden bg-background text-foreground"
				onContextMenu={(event) => {
					showNativeContextMenu(
						event,
						[{ id: 'copy-workspace-path', label: 'Copy Workspace Path', enabled: Boolean(workspaceLocation) }],
						{ 'copy-workspace-path': () => navigator.clipboard.writeText(workspaceLocation) }
					);
				}}
			>
				<Sidebar width={sidebarWidth}>
					<SidebarContent>{sidebar}</SidebarContent>
					<SidebarResizeHandle
						onPointerDown={startSidebarResize}
						onContextMenu={(event) => {
							showNativeContextMenu(
								event,
								[
									{ id: 'minimum', label: 'Minimum Width', enabled: sidebarWidth !== sidebarMinWidth },
									{ id: 'reset', label: 'Reset Width', enabled: sidebarWidth !== sidebarDefaultWidth },
									{ id: 'maximum', label: 'Maximum Width', enabled: sidebarWidth !== sidebarMaxWidth },
								],
								{
									minimum: () => setSidebarWidth(sidebarMinWidth),
									reset: () => setSidebarWidth(sidebarDefaultWidth),
									maximum: () => setSidebarWidth(sidebarMaxWidth),
								}
							);
						}}
					/>
				</Sidebar>

				<main className="relative min-h-0 min-w-0 flex-1">
					<WorkspaceViewer
						content={selectedContent}
						dirty={selectedDirty}
						error={selectedError}
						kind={selectedKind}
						loading={selectedLoading}
						mediaUrl={selectedMediaUrl}
						onChange={(content) => {
							selectedContentRef.current = content;
							setSelectedContent(content);
							setSelectedSaveError('');
						}}
						onSave={() => saveWorkspaceMarkdown(selectedPathRef.current, selectedContent)}
						path={selectedWorkspacePath}
						saveError={selectedSaveError}
						saving={selectedSaving}
					/>
				</main>
			</div>

			<Dialog
				open={Boolean(deleteTarget)}
				onOpenChange={(open) => {
					if (!open && !deleting) {
						setDeleteTarget(null);
						setDeleteError('');
					}
				}}
			>
				<DialogContent
					onContextMenu={(event) => {
						showNativeContextMenu(
							event,
							[
								{ id: 'cancel', label: 'Cancel', enabled: !deleting },
								{ id: 'delete', label: 'Delete File', enabled: !deleting },
							],
							{
								cancel: () => setDeleteTarget(null),
								delete: () => confirmDeleteWorkspaceFile(),
							}
						);
					}}
				>
					<DialogHeader>
						<DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
						<DialogDescription>
							This permanently deletes the file from the agent workspace. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					{deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={deleting}>Cancel</Button>
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							disabled={deleting}
							onClick={() => void confirmDeleteWorkspaceFile()}
						>
							{deleting ? 'Deleting…' : 'Delete File'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
