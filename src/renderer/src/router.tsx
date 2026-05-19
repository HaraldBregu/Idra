import React, { Suspense, lazy, useState, type ReactNode } from 'react';
import {
	Navigate,
	Outlet,
	createHashRouter,
	useLocation,
	type RouteObject,
} from 'react-router-dom';
import { ErrorBoundary, RouteErrorElement } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { SettingsPageSkeleton } from './pages/settings/components';
import { useTranslation } from 'react-i18next';
import { CommandMenu, PageTransition } from './experience';
import { ChatModeContext, type ChatMode } from './contexts/chat-mode';
import { cn } from './lib/utils';

const StartPage = lazy(() => import('./pages/start/StartPage'));
const HomePage = lazy(() => import('./pages/home/Page'));
const SettingsOverviewPage = lazy(() => import('./pages/settings/pages/overview/Page'));
const GeneralPage = lazy(() => import('./pages/settings/pages/general/Page'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/channels/Page'));
const ChannelDetailPage = lazy(() => import('./pages/settings/pages/channels/detail/Page'));
const ConnectorsPage = lazy(() => import('./pages/settings/pages/connectors/Page'));
const ConnectorDetailsPage = lazy(() => import('./pages/settings/pages/connectors/details/Page'));
const AgentDetailsPage = lazy(() => import('./pages/settings/pages/general/agentdetails/Page'));
const SkillsPage = lazy(() => import('./pages/settings/pages/skills/Page'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/providers/Page'));
const CronPage = lazy(() => import('./pages/settings/pages/cron/Page'));
const CronDetailsPage = lazy(() => import('./pages/settings/pages/cron/details/Page'));
const HeartbeatPage = lazy(() => import('./pages/settings/pages/heartbeat/Page'));
const AppsPage = lazy(() => import('./pages/settings/pages/apps/Page'));

function RouteWrapper({ children }: { readonly children: ReactNode }): React.JSX.Element {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

function SettingsRouteWrapper({ children }: { readonly children: ReactNode }): React.JSX.Element {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<SettingsPageSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

function RootRouteComponent(): React.JSX.Element {
	const { t } = useTranslation();
	const location = useLocation();
	const [chatMode, setChatMode] = useState<ChatMode>('chat');

	const isStart = location.pathname === '/start';

	return (
		<ChatModeContext.Provider value={{ mode: chatMode, setMode: setChatMode }}>
			<div
				className={cn(
					'app-translucent-window flex h-screen flex-col overflow-hidden bg-background text-foreground'
				)}
			>
				<TitleBar
					title={isStart ? 'Set up Friday' : t('appTitle')}
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
								path: 'agentdetails/:agentId',
								element: (
									<RouteWrapper>
										<AgentDetailsPage />
									</RouteWrapper>
								),
							},
						],
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
						children: [
							{
								index: true,
								element: (
									<RouteWrapper>
										<ConnectorsPage />
									</RouteWrapper>
								),
							},
							{
								path: 'connectordetails/:connectorId',
								element: (
									<RouteWrapper>
										<ConnectorDetailsPage />
									</RouteWrapper>
								),
							},
						],
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
						path: 'heartbeat',
						element: (
							<RouteWrapper>
								<HeartbeatPage />
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
