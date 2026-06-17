import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, lazy, useState } from 'react';
import { Navigate, Outlet, createHashRouter, useLocation, } from 'react-router-dom';
import { ErrorBoundary, RouteErrorElement } from './components/app/base/ErrorBoundary';
import { HomePageLoadingSkeleton, PageLoadingSkeleton, } from './components/app/base/PageLoadingSkeleton';
import { TitleBar } from './components/app/titlebar/TitleBar';
import { Layout as SettingsLayout } from './pages/settings';
import { SettingsPageSkeleton } from './pages/settings/components';
import { useTranslation } from 'react-i18next';
import { CommandMenu, PageTransition } from './experience';
import { ChatModeContext } from './contexts/chat-mode';
import { cn } from './lib/utils';
import HomePage from './pages/home/Page';
const StartPage = lazy(() => import('./pages/start/StartPage'));
const SettingsOverviewPage = lazy(() => import('./pages/settings/pages/overview/Page'));
const GeneralPage = lazy(() => import('./pages/settings/pages/general/Page'));
const SystemPage = lazy(() => import('./pages/settings/pages/system/Page'));
const ChannelsPage = lazy(() => import('./pages/settings/pages/channels/Page'));
const ChannelDetailPage = lazy(() => import('./pages/settings/pages/channels/detail/Page'));
const ConnectorsPage = lazy(() => import('./pages/settings/pages/connectors/Page'));
const ConnectorDetailsPage = lazy(() => import('./pages/settings/pages/connectors/details/Page'));
const SkillsPage = lazy(() => import('./pages/settings/pages/skills/Page'));
const SkillDetailsPage = lazy(() => import('./pages/settings/pages/skills/details/Page'));
const ProvidersPage = lazy(() => import('./pages/settings/pages/providers/Page'));
const ModelServicePage = lazy(() => import('./pages/settings/pages/model-services/Page'));
function RouteWrapper({ children, fallback = _jsx(PageLoadingSkeleton, {}), }) {
    return (_jsx(ErrorBoundary, { level: "route", children: _jsx(Suspense, { fallback: fallback, children: children }) }));
}
function SettingsRouteWrapper({ children }) {
    return (_jsx(ErrorBoundary, { level: "route", children: _jsx(Suspense, { fallback: _jsx(SettingsPageSkeleton, {}), children: children }) }));
}
function RootRouteComponent() {
    const { t } = useTranslation();
    const location = useLocation();
    const [chatMode, setChatMode] = useState('chat');
    const isStart = location.pathname === '/start';
    return (_jsx(ChatModeContext.Provider, { value: { mode: chatMode, setMode: setChatMode }, children: _jsxs("div", { className: cn('app-translucent-window flex h-screen flex-col overflow-hidden bg-background text-foreground'), children: [_jsx(TitleBar, { title: isStart ? 'Set up Friday' : t('appTitle') }), _jsx("div", { className: "min-h-0 flex-1 overflow-hidden pt-12", children: _jsx(PageTransition, { children: _jsx(Outlet, {}) }) }), _jsx(CommandMenu, {})] }) }));
}
const routes = [
    {
        element: _jsx(RootRouteComponent, {}),
        errorElement: (_jsx("div", { className: "app-translucent-window flex h-screen flex-col text-foreground", children: _jsx(RouteErrorElement, {}) })),
        children: [
            {
                index: true,
                element: _jsx(Navigate, { to: "/start", replace: true }),
            },
            {
                path: 'start',
                element: (_jsx(RouteWrapper, { children: _jsx(StartPage, {}) })),
            },
            {
                path: 'config',
                element: _jsx(Navigate, { to: "/start", replace: true }),
            },
            {
                path: 'home',
                element: (_jsx(RouteWrapper, { fallback: _jsx(HomePageLoadingSkeleton, {}), children: _jsx(HomePage, {}) })),
            },
            {
                path: 'settings',
                element: (_jsx(RouteWrapper, { children: _jsx(SettingsLayout, {}) })),
                children: [
                    {
                        index: true,
                        element: (_jsx(SettingsRouteWrapper, { children: _jsx(SettingsOverviewPage, {}) })),
                    },
                    {
                        path: 'general',
                        element: (_jsx(SettingsRouteWrapper, { children: _jsx(GeneralPage, {}) })),
                    },
                    {
                        path: 'system',
                        element: (_jsx(SettingsRouteWrapper, { children: _jsx(SystemPage, {}) })),
                    },
                    {
                        path: 'channels',
                        children: [
                            {
                                index: true,
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ChannelsPage, {}) })),
                            },
                            {
                                path: 'channelDetail/:channelId',
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ChannelDetailPage, {}) })),
                            },
                        ],
                    },
                    {
                        path: 'connectors',
                        children: [
                            {
                                index: true,
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ConnectorsPage, {}) })),
                            },
                            {
                                path: 'connectordetails/:connectorId',
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ConnectorDetailsPage, {}) })),
                            },
                            {
                                path: 'configure/:connectorCatalogId',
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ConnectorDetailsPage, {}) })),
                            },
                        ],
                    },
                    {
                        path: 'skills',
                        children: [
                            {
                                index: true,
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(SkillsPage, {}) })),
                            },
                            {
                                path: 'skilldetails/:skillId',
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(SkillDetailsPage, {}) })),
                            },
                        ],
                    },
                    {
                        path: 'providers',
                        element: (_jsx(SettingsRouteWrapper, { children: _jsx(ProvidersPage, {}) })),
                    },
                    {
                        path: 'model-services',
                        children: [
                            {
                                path: ':serviceId/details',
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ModelServicePage, {}) })),
                            },
                            {
                                path: ':serviceId/details/chathistory',
                                element: (_jsx(SettingsRouteWrapper, { children: _jsx(ModelServicePage, {}) })),
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
