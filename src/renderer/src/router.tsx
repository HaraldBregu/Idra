import React, { Suspense, lazy, useState, type ReactNode } from 'react';
import {
	Navigate,
	Outlet,
	createHashRouter,
	useLocation,
	useNavigate,
	type RouteObject,
} from 'react-router-dom';
import { MessageSquare, Mic } from 'lucide-react';
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
	const navigate = useNavigate();
	const [chatMode, setChatMode] = useState<ChatMode>('chat');

	const isStart = location.pathname === '/start';
	const isHome = location.pathname === '/home';
	const isHomeVoice = isHome && chatMode === 'voice';
	const homeTitleBarStyle: React.CSSProperties | undefined = isHomeVoice
		? {
				backgroundColor: 'rgba(33, 30, 38, 0.95)',
				borderColor: 'rgba(255, 255, 255, 0.1)',
				boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
			}
		: isHome
			? {
					backgroundColor: 'rgba(251, 248, 246, 0.9)',
					borderColor: '#e6e0e4',
					boxShadow: '0 1px 2px rgba(67, 59, 80, 0.05)',
				}
			: undefined;

	const chatModeToggle = isHome ? (
		<div
			className={cn(
				'pointer-events-auto flex items-center gap-0.5 rounded-full border p-1 shadow-sm',
				isHomeVoice ? 'border-white/10 bg-white/10' : 'border-[#e4dfe4] bg-[#ece9eb]'
			)}
			style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
		>
			<button
				type="button"
				onClick={() => setChatMode('chat')}
				aria-pressed={chatMode === 'chat'}
				className={cn(
					'flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a7aff]',
					chatMode === 'chat'
						? 'border-2 border-[#0a7aff] bg-white text-[#24212a] shadow-[0_0_0_2px_rgba(10,122,255,0.16)]'
						: isHomeVoice
							? 'text-[#746f7e] hover:text-[#efeaf4]'
							: 'text-[#77737e] hover:text-[#24212a]'
				)}
			>
				<MessageSquare className="size-4" strokeWidth={2.2} />
				Chat
			</button>
			<button
				type="button"
				onClick={() => setChatMode('voice')}
				aria-pressed={chatMode === 'voice'}
				className={cn(
					'flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a7aff]',
					chatMode === 'voice'
						? 'border-2 border-[#0a7aff] bg-white text-[#24212a] shadow-[0_0_0_2px_rgba(10,122,255,0.16)]'
						: isHomeVoice
							? 'text-[#746f7e] hover:text-[#efeaf4]'
							: 'text-[#77737e] hover:text-[#24212a]'
				)}
			>
				<Mic className="size-4" strokeWidth={2.2} />
				Voice
			</button>
		</div>
	) : undefined;
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
					'app-translucent-window flex h-screen flex-col overflow-hidden text-foreground',
					isHomeVoice ? 'bg-[#1f1c24]' : isHome ? 'bg-[#fbf8f6]' : undefined
				)}
			>
				<TitleBar
					title={isStart ? 'Set up Friday' : t('appTitle')}
					centerContent={chatModeToggle}
					rightContent={startTitleBarAction}
					style={homeTitleBarStyle}
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
