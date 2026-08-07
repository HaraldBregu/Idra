import { useEffect, useState, type CSSProperties } from 'react';

import { agent, app, isFriday, type AppThemeData, type WorkspaceTreeEntry } from '@friday/sdk';
import { AppSidebar } from '@/components/app-sidebar';
import { WorkspaceViewer } from '@/components/workspace-viewer';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const fallbackTheme: AppThemeData = {
	themeMode: 'light',
	isDark: false,
	colors: {},
};

export default function App() {
	const [theme, setTheme] = useState<AppThemeData>(fallbackTheme);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [workspaceLocation, setWorkspaceLocation] = useState('');
	const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceTreeEntry[]>([]);
	const [workspaceLoading, setWorkspaceLoading] = useState(false);
	const [workspaceError, setWorkspaceError] = useState('');
	const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string | null>(null);
	const [selectedContent, setSelectedContent] = useState('');
	const [selectedLoading, setSelectedLoading] = useState(false);
	const [selectedError, setSelectedError] = useState('');
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
		setSidebarOpen(false);
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
				<aside className="hidden w-[176px] shrink-0 border-r border-sidebar-border lg:block">{sidebar}</aside>

				<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
					<SheetContent
						side="left"
						className="w-[286px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[286px] [&>button]:text-sidebar-foreground"
					>
						<SheetTitle className="sr-only">Notes navigation</SheetTitle>
						<SheetDescription className="sr-only">Choose a notebook or create a new note.</SheetDescription>
						{sidebar}
					</SheetContent>
				</Sheet>

				<main className="relative min-h-0 min-w-0 flex-1">
					<WorkspaceViewer
						content={selectedContent}
						error={selectedError}
						loading={selectedLoading}
						onOpenMenu={() => setSidebarOpen(true)}
						path={selectedWorkspacePath}
					/>
				</main>
			</div>
		</TooltipProvider>
	);
}
