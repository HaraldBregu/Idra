import React, { Suspense, lazy, useState, type ReactNode } from 'react';
import {
	Navigate,
	Outlet,
	createHashRouter,
	useLocation,
	useNavigate,
	type RouteObject,
} from 'react-router-dom';
import { ErrorBoundary, RouteErrorElement } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { useTranslation } from 'react-i18next';
import { CommandMenu, PageTransition } from './experience';
import { ChatModeContext, type ChatMode } from './contexts/chat-mode';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';

const StartPage = lazy(() => import('./pages/start/StartPage'));
const HomePage = lazy(() => import('./pages/home/Page'));
const SettingsOverviewPage = lazy(() => import('./pages/settings/pages/OverviewPage'));
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/ChannelsPage'));
const ChannelDetailPage = lazy(() => import('./pages/settings/pages/ChannelDetailPage'));
const ConnectorsPage = lazy(() => import('./pages/settings/pages/connectors/Page'));
const SkillsPage = lazy(() => import('./pages/settings/pages/SkillsPage'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/ProvidersPage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const CronPage = lazy(() => import('./pages/settings/pages/CronPage'));
const CronDetailsPage = lazy(() => import('./pages/settings/pages/CronDetailsPage'));
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
	const navigate = useNavigate();
	const [chatMode, setChatMode] = useState<ChatMode>('chat');

	const isStart = location.pathname === '/start';

	const startTitleBarAction = isStart ? (
		<Button
			type="button"
			variant="ghost"
			size="xs"
			onClick={() => navigate('/home')}
		>
			Skip
		</Button>
	) : undefined;

	return (
		<ChatModeContext.Provider value={{ mode: chatMode, setMode: setChatMode }}>
			<div
				className={cn(
					'app-translucent-window flex h-screen flex-col overflow-hidden bg-background text-foreground'
				)}
			>
				<TitleBar
					title={isStart ? 'Set up Friday' : t('appTitle')}
					rightContent={startTitleBarAction}
				/>
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
								<SettingsOverviewPage />
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
						children: [
							{
								index: true,
								element: (
									<RouteWrapper>
										<ChannelsPage />
									</RouteWrapper>
								),
							},
							{
								path: 'channelDetail/:channelId',
								element: (
									<RouteWrapper>
										<ChannelDetailPage />
									</RouteWrapper>
								),
							},
						],
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
						children: [
							{
								index: true,
								element: (
									<RouteWrapper>
										<CronPage />
									</RouteWrapper>
								),
							},
							{
								path: 'crondetails/:jobId',
								element: (
									<RouteWrapper>
										<CronDetailsPage />
									</RouteWrapper>
								),
							},
						],
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
