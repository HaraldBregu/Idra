import React, { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Outlet, createHashRouter, type RouteObject } from 'react-router-dom';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { useTranslation } from 'react-i18next';

const StartPage = lazy(() => import('./pages/start/StartPage'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const AssistantPage = lazy(() => import('./pages/settings/pages/assistant/Page'));
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const AccountPage = lazy(() => import('./pages/settings/pages/AccountPage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const DeveloperPage = lazy(() => import('./pages/settings/pages/DeveloperPage'));

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
		<div className="flex h-screen flex-col bg-background">
			<TitleBar title={t('appTitle')} />
			<div className="min-h-0 flex-1">
				<Outlet />
			</div>
		</div>
	);
}

const routes: RouteObject[] = [
	{
		element: <RootRouteComponent />,
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
						path: 'account',
						element: (
							<RouteWrapper>
								<AccountPage />
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
						path: 'developer',
						element: (
							<RouteWrapper>
								<DeveloperPage />
							</RouteWrapper>
						),
					},
					{
						path: 'assistant',
						element: (
							<RouteWrapper>
								<AssistantPage />
							</RouteWrapper>
						),
					},
				],
			},
		],
	},
];

export const router = createHashRouter(routes);
