import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

import {
	agent,
	app,
	isFriday,
	workspaceFileType,
	type AppThemeData,
	type WorkspaceFileKind,
	type WorkspaceTreeEntry,
} from '@friday/sdk';
import { AppSidebar } from '@/components/app-sidebar';
import { WorkspaceViewer } from '@/components/workspace-viewer';
import { Sidebar, SidebarContent, SidebarResizeHandle } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
	const [sidebarWidth, setSidebarWidth] = useState(sidebarDefaultWidth);
	const selectedPathRef = useRef<string | null>(null);
	const saveInFlightRef = useRef(false);
	const selectionRequestRef = useRef(0);
	const selectedDirty = selectedKind === 'markdown' && selectedContent !== selectedSavedContent;
	const themeStyle = Object.fromEntries(
		Object.entries(theme.colors).map(([name, value]) => [`--${name}`, value]),
	) as CSSProperties;

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
		if (!filePath || selectedKind !== 'markdown' || !isFriday() || saveInFlightRef.current) {
			return false;
		}
		saveInFlightRef.current = true;
		setSelectedSaving(true);
		setSelectedSaveError('');
		try {
			await agent.writeWorkspaceMarkdown(filePath, content);
			if (selectedPathRef.current === filePath) setSelectedSavedContent(content);
			return true;
		} catch (error) {
			if (selectedPathRef.current === filePath) {
				setSelectedSaveError(
					error instanceof Error ? error.message : 'Unable to save the Markdown file.'
				);
			}
			return false;
		} finally {
			saveInFlightRef.current = false;
			if (selectedPathRef.current === filePath) setSelectedSaving(false);
		}
	}, [selectedContent, selectedKind]);

	useEffect(() => {
		if (!selectedDirty || selectedSaving || selectedSaveError) return;
		const timeout = window.setTimeout(() => {
			void saveWorkspaceMarkdown(selectedPathRef.current, selectedContent);
		}, 700);
		return () => window.clearTimeout(timeout);
	}, [saveWorkspaceMarkdown, selectedContent, selectedDirty, selectedSaveError, selectedSaving]);

	useEffect(() => {
		if (!selectedDirty) return;
		const preventUnsavedClose = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = 'Changes are still being saved.';
			void saveWorkspaceMarkdown(selectedPathRef.current, selectedContent);
		};
		window.addEventListener('beforeunload', preventUnsavedClose);
		return () => window.removeEventListener('beforeunload', preventUnsavedClose);
	}, [saveWorkspaceMarkdown, selectedContent, selectedDirty]);

	async function selectWorkspaceEntry(entry: WorkspaceTreeEntry) {
		if (entry.type !== 'file') return;
		if (selectedKind === 'markdown' && selectedContent !== selectedSavedContent) {
			const saved = await saveWorkspaceMarkdown(selectedPathRef.current, selectedContent);
			if (!saved) return;
		}

		const requestId = selectionRequestRef.current + 1;
		selectionRequestRef.current = requestId;
		const kind = workspaceFileType(entry.path).kind;
		selectedPathRef.current = entry.path;
		setSelectedWorkspacePath(entry.path);
		setSelectedKind(kind);
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
				className={cn('flex h-dvh min-h-[520px] overflow-hidden bg-background text-foreground', theme.isDark && 'dark')}
				style={themeStyle}
			>
				<Sidebar width={sidebarWidth}>
					<SidebarContent>{sidebar}</SidebarContent>
					<SidebarResizeHandle onPointerDown={startSidebarResize} />
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
		</TooltipProvider>
	);
}
