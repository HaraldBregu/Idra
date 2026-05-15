import React, { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Outlet, createHashRouter, type RouteObject } from 'react-router-dom';
import { ErrorBoundary, RouteErrorElement } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { useTranslation } from 'react-i18next';
import { PageTransition } from './experience';

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

	return (
		<div className="app-translucent-window flex h-screen flex-col overflow-hidden text-foreground">
			<TitleBar title={t('appTitle')} />
			<div className="min-h-0 flex-1 overflow-hidden pt-12">
				<PageTransition>
					<Outlet />
				</PageTransition>
			</div>
		</div>
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
