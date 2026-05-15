import React, { Suspense, lazy, useState, type ReactNode } from 'react';
import { Navigate, Outlet, createHashRouter, useLocation, type RouteObject } from 'react-router-dom';
import { MessageSquare, Mic } from 'lucide-react';
import { ErrorBoundary, RouteErrorElement } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { useTranslation } from 'react-i18next';
import { CommandMenu, PageTransition } from './experience';
import { ChatModeContext, type ChatMode } from './contexts/chat-mode';
import { cn } from './lib/utils';

const StartPage = lazy(() => import('./pages/start/StartPage'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/ChannelsPage'));
const ConnectorsPage = lazy(() => import('./pages/settings/pages/ConnectorsPage'));
const SkillsPage = lazy(() => import('./pages/settings/pages/SkillsPage'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/ProvidersPage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const CronPage = lazy(() => import('./pages/settings/pages/CronPage'));
const AppsPage = lazy(() => import('./pages/settings/pages/AppsPage'));

function RouteWrapper({ children }: { readonly children: ReactNode }): React.JSX.Element {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

function RootRouteComponent(): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	const [chatMode, setChatMode] = useState<ChatMode>('chat');

	const isHome = location.pathname === '/home';

	const chatModeToggle = isHome ? (
		<div
			className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-muted/40 px-1 py-1"
			style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
		>
			<button
				type="button"
				onClick={() => setChatMode('chat')}
				className={cn(
					'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
					chatMode === 'chat'
						? 'border border-border/60 bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<MessageSquare className="size-3" strokeWidth={1.5} />
				Chat
			</button>
			<button
				type="button"
				onClick={() => setChatMode('voice')}
				className={cn(
					'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
					chatMode === 'voice'
						? 'border border-border/60 bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<Mic className="size-3" strokeWidth={1.5} />
				Voice
			</button>
		</div>
	) : undefined;

	return (
		<ChatModeContext.Provider value={{ mode: chatMode, setMode: setChatMode }}>
			<div className="app-translucent-window flex h-screen flex-col overflow-hidden text-foreground">
				<TitleBar title={t('appTitle')} centerContent={chatModeToggle} />
				<div className="min-h-0 flex-1 overflow-hidden pt-12">
					<PageTransition>
						<Outlet />
					</PageTransition>
				</div>
				<CommandMenu />
			</div>
		</ChatModeContext.Provider>
	);
}

const routes: RouteObject[] = [
	{
		element: <RootRouteComponent />,
		errorElement: (
			<div className="app-translucent-window flex h-screen flex-col text-foreground">
				<RouteErrorElement />
			</div>
		),
		children: [
			{
				index: true,
				element: <Navigate to="/start" replace />,
			},
			{
				path: 'start',
				element: (
					<RouteWrapper>
						<StartPage />
					</RouteWrapper>
				),
			},
			{
				path: 'config',
				element: <Navigate to="/start" replace />,
			},
			{
				path: 'home',
				element: (
					<RouteWrapper>
						<HomePage />
					</RouteWrapper>
				),
			},
			{
				path: 'settings',
				element: (
					<RouteWrapper>
						<SettingsLayout />
					</RouteWrapper>
				),
				children: [
					{
						index: true,
						element: (
							<RouteWrapper>
								<GeneralPage />
							</RouteWrapper>
						),
					},
					{
						path: 'general',
						element: (
							<RouteWrapper>
								<GeneralPage />
							</RouteWrapper>
						),
					},
					{
						path: 'channels',
						element: (
							<RouteWrapper>
								<ChannelsPage />
							</RouteWrapper>
						),
					},
					{
						path: 'connectors',
						element: (
							<RouteWrapper>
								<ConnectorsPage />
							</RouteWrapper>
						),
					},
					{
						path: 'skills',
						element: (
							<RouteWrapper>
								<SkillsPage />
							</RouteWrapper>
						),
					},
					{
						path: 'providers',
						element: (
							<RouteWrapper>
								<ProvidersPage />
							</RouteWrapper>
						),
					},
					{
						path: 'system',
						element: (
							<RouteWrapper>
								<SystemPage />
							</RouteWrapper>
						),
					},
					{
						path: 'cron',
						element: (
							<RouteWrapper>
								<CronPage />
							</RouteWrapper>
						),
					},
					{
						path: 'apps',
						element: (
							<RouteWrapper>
								<AppsPage />
							</RouteWrapper>
						),
					},
					{
						path: '*',
						loader: () => {
							throw new Response('Not Found', { status: 404, statusText: 'Not Found' });
						},
					},
				],
			},
			{
				path: '*',
				loader: () => {
					throw new Response('Not Found', { status: 404, statusText: 'Not Found' });
				},
			},
		],
	},
];

export const router = createHashRouter(routes);
