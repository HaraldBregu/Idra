import React, { Suspense, lazy, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
	createHashHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	Outlet,
} from '@tanstack/react-router';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { useTranslation } from 'react-i18next';

const SplashPage = lazy(() => import('./pages/splash/SplashPage'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const AssistantPage = lazy(() => import('./pages/settings/pages/assistant/Page'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/channels/Page'));
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const AccountPage = lazy(() => import('./pages/settings/pages/AccountPage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const ThemesPage = lazy(() => import('./pages/settings/pages/ThemesPage'));
const EditorPage = lazy(() => import('./pages/settings/pages/EditorPage'));
const DeveloperPage = lazy(() => import('./pages/settings/pages/DeveloperPage'));
const AgentsPage = lazy(() => import('./pages/settings/pages/agents/Page'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/providers/Page'));

export interface RouterContext {
	readonly startupInfo: AppStartupInfo;
	readonly setStartupInfo: Dispatch<SetStateAction<AppStartupInfo | null>>;
}

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

function SplashRouteComponent(): React.JSX.Element {
	return (
		<RouteWrapper>
			<SplashPage />
		</RouteWrapper>
	);
}

function HomeRouteComponent(): React.JSX.Element {
	return (
		<RouteWrapper>
			<HomePage />
		</RouteWrapper>
	);
}

function SettingsRouteComponent(): React.JSX.Element {
	return (
		<RouteWrapper>
			<SettingsLayout />
		</RouteWrapper>
	);
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: RootRouteComponent,
});

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: SplashRouteComponent,
});

const appHomeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'home',
	component: HomeRouteComponent,
});

const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'settings',
	component: SettingsRouteComponent,
});

const settingsIndexRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: '/',
	component: () => (
		<RouteWrapper>
			<GeneralPage />
		</RouteWrapper>
	),
});

const settingsGeneralRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'general',
	component: () => (
		<RouteWrapper>
			<GeneralPage />
		</RouteWrapper>
	),
});

const settingsAccountRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'account',
	component: () => (
		<RouteWrapper>
			<AccountPage />
		</RouteWrapper>
	),
});

const settingsThemesRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'themes',
	component: () => (
		<RouteWrapper>
			<ThemesPage />
		</RouteWrapper>
	),
});

const settingsEditorRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'editor',
	component: () => (
		<RouteWrapper>
			<EditorPage />
		</RouteWrapper>
	),
});

const settingsSystemRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'system',
	component: () => (
		<RouteWrapper>
			<SystemPage />
		</RouteWrapper>
	),
});

const settingsDeveloperRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'developer',
	component: () => (
		<RouteWrapper>
			<DeveloperPage />
		</RouteWrapper>
	),
});

const settingsAgentsRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'agents',
	component: () => (
		<RouteWrapper>
			<AgentsPage />
		</RouteWrapper>
	),
});

const settingsProvidersRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'providers',
	component: () => (
		<RouteWrapper>
			<ProvidersPage />
		</RouteWrapper>
	),
});

const settingsChannelsRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'channels',
	component: () => (
		<RouteWrapper>
			<ChannelsPage />
		</RouteWrapper>
	),
});

const settingsAssistantRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'assistant',
	component: () => (
		<RouteWrapper>
			<AssistantPage />
		</RouteWrapper>
	),
});

const routeTree = rootRoute.addChildren([
	homeRoute,
	appHomeRoute,
	settingsRoute.addChildren([
		settingsIndexRoute,
		settingsGeneralRoute,
		settingsAccountRoute,
		settingsThemesRoute,
		settingsEditorRoute,
		settingsSystemRoute,
		settingsDeveloperRoute,
		settingsAgentsRoute,
		settingsProvidersRoute,
		settingsChannelsRoute,
		settingsAssistantRoute,
	]),
]);

export const router = createRouter({
	routeTree,
	history: createHashHistory(),
	context: DEFAULT_ROUTER_CONTEXT,
	defaultPendingComponent: PageLoadingSkeleton,
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
