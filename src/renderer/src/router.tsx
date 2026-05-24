import React, { Suspense, lazy, useState, type ReactNode } from 'react';
import {
	Navigate,
	Outlet,
	createHashRouter,
	useLocation,
	type RouteObject,
} from 'react-router-dom';
import { ErrorBoundary, RouteErrorElement } from './components/app/base/ErrorBoundary';
import {
	HomePageLoadingSkeleton,
	PageLoadingSkeleton,
} from './components/app/base/PageLoadingSkeleton';
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
const SystemPage = lazy(() => import('./pages/settings/pages/system/Page'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/channels/Page'));
const ChannelDetailPage = lazy(() => import('./pages/settings/pages/channels/detail/Page'));
const ConnectorsPage = lazy(() => import('./pages/settings/pages/connectors/Page'));
const ConnectorDetailsPage = lazy(() => import('./pages/settings/pages/connectors/details/Page'));
const OperatorDetailsPage = lazy(() => import('./pages/settings/pages/operators/details/Page'));
const ChatHistoryPage = lazy(() => import('./pages/settings/pages/operators/details/chathistory/Page'));
const SkillsPage = lazy(() => import('./pages/settings/pages/skills/Page'));
const SkillDetailsPage = lazy(() => import('./pages/settings/pages/skills/details/Page'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/providers/Page'));
const MemoryPage = lazy(() => import('./pages/settings/pages/memory/Page'));
const MemoryDetailsPage = lazy(() => import('./pages/settings/pages/memory/details/Page'));
const RagPage = lazy(() => import('./pages/settings/pages/rag/Page'));
const RagDetailsPage = lazy(() => import('./pages/settings/pages/rag/details/Page'));
const WikiPage = lazy(() => import('./pages/settings/pages/wiki/Page'));
const WikiDetailsPage = lazy(() => import('./pages/settings/pages/wiki/details/Page'));
const CronPage = lazy(() => import('./pages/settings/pages/cron/Page'));
const CronDetailsPage = lazy(() => import('./pages/settings/pages/cron/details/Page'));
const TaskManagerPage = lazy(() => import('./pages/settings/pages/task-manager/Page'));
const TaskDetailsPage = lazy(() => import('./pages/settings/pages/task-manager/details/Page'));
const HeartbeatPage = lazy(() => import('./pages/settings/pages/heartbeat/Page'));
const MonitoringPage = lazy(() => import('./pages/settings/pages/monitoring/Page'));

function RouteWrapper({
	children,
	fallback = <PageLoadingSkeleton />,
}: {
	readonly children: ReactNode;
	readonly fallback?: ReactNode;
}): React.JSX.Element {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={fallback}>{children}</Suspense>
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
					<RouteWrapper fallback={<HomePageLoadingSkeleton />}>
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
							<SettingsRouteWrapper>
								<SettingsOverviewPage />
							</SettingsRouteWrapper>
						),
					},
					{
						path: 'general',
						element: (
							<SettingsRouteWrapper>
								<GeneralPage />
							</SettingsRouteWrapper>
						),
					},
					{
						path: 'system',
						element: (
							<SettingsRouteWrapper>
								<SystemPage />
							</SettingsRouteWrapper>
						),
					},
					{
						path: 'operators',
						children: [
							{
								index: true,
								element: <Navigate to="/settings" replace />,
							},
							{
								path: ':operatorId/details',
								children: [
									{
										index: true,
										element: (
											<SettingsRouteWrapper>
												<OperatorDetailsPage />
											</SettingsRouteWrapper>
										),
									},
									{
										path: 'chathistory',
										element: (
											<SettingsRouteWrapper>
												<ChatHistoryPage />
											</SettingsRouteWrapper>
										),
									},
								],
							},
						],
					},
					{
						path: 'channels',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<ChannelsPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'channelDetail/:channelId',
								element: (
									<SettingsRouteWrapper>
										<ChannelDetailPage />
									</SettingsRouteWrapper>
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
									<SettingsRouteWrapper>
										<ConnectorsPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'connectordetails/:connectorId',
								element: (
									<SettingsRouteWrapper>
										<ConnectorDetailsPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'configure/:connectorCatalogId',
								element: (
									<SettingsRouteWrapper>
										<ConnectorDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'skills',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<SkillsPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'skilldetails/:skillId',
								element: (
									<SettingsRouteWrapper>
										<SkillDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'providers',
						element: (
							<SettingsRouteWrapper>
								<ProvidersPage />
							</SettingsRouteWrapper>
						),
					},
					{
						path: 'memory',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<MemoryPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'details',
								element: (
									<SettingsRouteWrapper>
										<MemoryDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'rag',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<RagPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'details',
								element: (
									<SettingsRouteWrapper>
										<RagDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'wiki',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<WikiPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'details',
								element: (
									<SettingsRouteWrapper>
										<WikiDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'cron',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<CronPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'crondetails/:jobId',
								element: (
									<SettingsRouteWrapper>
										<CronDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'task-manager',
						children: [
							{
								index: true,
								element: (
									<SettingsRouteWrapper>
										<TaskManagerPage />
									</SettingsRouteWrapper>
								),
							},
							{
								path: 'taskdetails/:taskId',
								element: (
									<SettingsRouteWrapper>
										<TaskDetailsPage />
									</SettingsRouteWrapper>
								),
							},
						],
					},
					{
						path: 'heartbeat',
						element: (
							<SettingsRouteWrapper>
								<HeartbeatPage />
							</SettingsRouteWrapper>
						),
					},
					{
						path: 'monitoring',
						element: (
							<SettingsRouteWrapper>
								<MonitoringPage />
							</SettingsRouteWrapper>
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
