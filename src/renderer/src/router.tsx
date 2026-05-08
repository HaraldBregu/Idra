import React, { Suspense, lazy } from 'react';
import {
	createHashHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
} from '@tanstack/react-router';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { PageLoadingSkeleton } from './components/app/base/PageLoadingSkeleton';
import WelcomePage from './pages/welcome/WelcomePage';
import ConfigPage from './pages/welcome/ConfigPage';
import { Layout as SettingsLayout } from './pages/settings';
import { useStartupRouterContext } from './startup-router-context';

const SplashPage = lazy(() => import('./pages/splash/SplashPage'));
const AssistantPage = lazy(() => import('./pages/settings/pages/assistant/Page'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/channels/Page'));
const GeneralPage = lazy(() => import('./pages/settings/pages/GeneralPage'));
const AccountPage = lazy(() => import('./pages/settings/pages/AccountPage'));
const WorkspacePage = lazy(() => import('./pages/settings/pages/WorkspacePage'));
const SystemPage = lazy(() => import('./pages/settings/pages/SystemPage'));
const ThemesPage = lazy(() => import('./pages/settings/pages/ThemesPage'));
const EditorPage = lazy(() => import('./pages/settings/pages/EditorPage'));
const DeveloperPage = lazy(() => import('./pages/settings/pages/DeveloperPage'));
const AgentsPage = lazy(() => import('./pages/settings/pages/agents/Page'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/providers/Page'));

function RouteWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ErrorBoundary level="route">
			<Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
		</ErrorBoundary>
	);
}

function RootRouteComponent() {
	return <Outlet />;
}

function HomeRouteComponent() {
	const { showSplash, startupInfo, setStartupInfo } = useStartupRouterContext();

	if (showSplash) {
		return (
			<RouteWrapper>
				<SplashPage />
			</RouteWrapper>
		);
	}

	if (startupInfo.isInitialized) {
		return <WelcomePage />;
	}

	return (
		<RouteWrapper>
			<ConfigPage onConfigured={setStartupInfo} />
		</RouteWrapper>
	);
}

function ConfigRouteComponent() {
	const { setStartupInfo } = useStartupRouterContext();

	return (
		<RouteWrapper>
			<ConfigPage onConfigured={setStartupInfo} />
		</RouteWrapper>
	);
}

function SettingsRouteComponent() {
	return (
		<RouteWrapper>
			<SettingsLayout />
		</RouteWrapper>
	);
}

const rootRoute = createRootRoute({
	component: RootRouteComponent,
});

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: HomeRouteComponent,
});

const configRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'config',
	component: ConfigRouteComponent,
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

const settingsWorkspaceRoute = createRoute({
	getParentRoute: () => settingsRoute,
	path: 'workspace',
	component: () => (
		<RouteWrapper>
			<WorkspacePage />
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
	configRoute,
	settingsRoute.addChildren([
		settingsIndexRoute,
		settingsGeneralRoute,
		settingsAccountRoute,
		settingsWorkspaceRoute,
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
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
