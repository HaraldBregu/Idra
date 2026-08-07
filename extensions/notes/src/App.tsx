import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react';

import { agent, app, isFriday, type AppThemeData, type WorkspaceTreeEntry } from '@friday/sdk';
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
const sidebarMinWidth = 260;
const sidebarMaxWidth = 520;
const sidebarDefaultWidth = 340;

export default function App() {
	const [theme, setTheme] = useState<AppThemeData>(fallbackTheme);
	const [workspaceLocation, setWorkspaceLocation] = useState('');
	const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceTreeEntry[]>([]);
	const [workspaceLoading, setWorkspaceLoading] = useState(false);
	const [workspaceError, setWorkspaceError] = useState('');
	const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string | null>(null);
	const [selectedContent, setSelectedContent] = useState('');
	const [selectedLoading, setSelectedLoading] = useState(false);
	const [selectedError, setSelectedError] = useState('');
	const [sidebarWidth, setSidebarWidth] = useState(sidebarDefaultWidth);
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

	async function selectWorkspaceEntry(entry: WorkspaceTreeEntry) {
		setSelectedWorkspacePath(entry.path);
		setSelectedContent('');
		setSelectedError('');
		if (entry.type !== 'file') return;

		setSelectedLoading(true);
		try {
			setSelectedContent(await agent.readWorkspaceFile(entry.path));
		} catch (error) {
			setSelectedError(error instanceof Error ? error.message : 'Unable to read file.');
		} finally {
			setSelectedLoading(false);
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
						error={selectedError}
						loading={selectedLoading}
						path={selectedWorkspacePath}
					/>
				</main>
			</div>
		</TooltipProvider>
	);
}
