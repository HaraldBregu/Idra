import React, { useState, useEffect } from 'react';
import { Menu, PanelLeft, Minus, X, ArrowLeft, ArrowRight, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { TitleBarRightContainer } from './TitleBarRightContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';

// Synchronous platform check — no hooks, no async, no state.
// macOS uses native traffic-light buttons; every other OS needs custom controls.
const isMac =
	typeof navigator !== 'undefined' &&
	(navigator.platform === 'MacIntel' || navigator.platform.startsWith('Mac'));

// Windows-style maximize icon
function MaximizeIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 10 10" fill="none">
			<rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
		</svg>
	);
}

// Windows-style restore icon (two overlapping squares)
function RestoreIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 10 10" fill="none">
			<path stroke="currentColor" strokeWidth="1" d="M3 2.5h4.5V7M0.5 0.5h6v6h-6z" />
		</svg>
	);
}

export interface TitleBarProps {
	/** Text displayed centered in the title bar */
	title?: string;
	/** Called when the sidebar toggle button is clicked */
	onToggleSidebar?: () => void;
	/** Called when the back navigation button is clicked */
	onNavigateBack?: () => void;
	/** Called when the forward navigation button is clicked */
	onNavigateForward?: () => void;
	/** When true, renders agentic + info sidebar toggle buttons on the right */
	showSidebarToggles?: boolean;
}

export const TitleBar = React.memo(function TitleBar({
	title = 'Application Name',
	onToggleSidebar,
	onNavigateBack,
	onNavigateForward,
	showSidebarToggles: _showSidebarToggles = false,
}: TitleBarProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const [isMaximized, setIsMaximized] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);

	const isHome = location.pathname === '/home';
	const isStart = location.pathname === '/start';
	const isSettings = location.pathname.startsWith('/settings');
	const titleBarTitle = isSettings ? t('settings.title', 'Settings') : title;
	const homeButtonLabel = isSettings ? 'Friday' : t('titleBar.home', 'Home');

	useEffect(() => {
		if (!window.win) return;

		window.win.isMaximized().then(setIsMaximized);
		window.win.isFullScreen().then(setIsFullScreen);

		const unsubMax = window.win.onMaximizeChange(setIsMaximized);
		const unsubFs = window.win.onFullScreenChange(setIsFullScreen);
		return () => {
			unsubMax();
			unsubFs();
		};
	}, []);

	const btnBase = `
    flex items-center justify-center h-full w-[46px]
    text-muted-foreground
    hover:bg-accent/80 hover:text-foreground
    active:bg-accent
    transition-colors duration-100
  `;

	const btnNoHover = `
    flex items-center justify-center h-full w-[46px]
    text-muted-foreground
  `;

	const btnNavNoHover = `
    flex items-center justify-center h-full w-[28px]
    text-muted-foreground
  `;

	const navigateToSettings = (path: string): void => {
		navigate(path);
	};

	return (
		<TitleBarContainer className="border-none bg-transparent">
			{/* ── Left: burger menu (Windows) + optional sidebar toggle ── */}
			<TitleBarLeftContainer isMac={isMac} isFullScreen={isFullScreen}>
				{!isMac && (
					<button
						type="button"
						onClick={() => {}}
						className={btnNoHover}
						title={t('titleBar.applicationMenu')}
					>
						<Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
					</button>
				)}

				{!isStart && (
					<DropdownMenu>
						<DropdownMenuTrigger
							className={
								isMac
									? 'flex items-center justify-center h-full px-3 text-muted-foreground transition-colors hover:text-foreground'
									: btnNoHover
							}
							title={t('settings.title', 'Settings')}
						>
							<Settings
								className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
								strokeWidth={1.5}
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-44">
							<DropdownMenuItem onClick={() => navigateToSettings('/settings/general')}>
								{t('settings.tabs.general')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigateToSettings('/settings/account')}>
								{t('settings.tabs.account')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigateToSettings('/settings/channels')}>
								{t('settings.tabs.channels')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigateToSettings('/settings/system')}>
								{t('settings.tabs.system')}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigateToSettings('/settings/cron')}>
								{t('settings.tabs.cron')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{!isHome && !isStart && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => navigate('/home')}
						title={homeButtonLabel}
					>
						{homeButtonLabel}
					</Button>
				)}

				{onToggleSidebar && (
					<button
						type="button"
						onClick={onToggleSidebar}
						className={
							isMac
								? 'flex items-center justify-center h-full px-3 text-muted-foreground transition-colors hover:text-foreground'
								: btnNoHover
						}
						title={t('titleBar.toggleSidebar')}
					>
						<PanelLeft
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}

				{onNavigateBack && (
					<button
						type="button"
						onClick={onNavigateBack}
						className={
							isMac
								? 'flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground'
								: btnNavNoHover
						}
						title={t('titleBar.navigateBack')}
					>
						<ArrowLeft
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}

				{onNavigateForward && (
					<button
						type="button"
						onClick={onNavigateForward}
						className={
							isMac
								? 'flex items-center justify-center h-full px-1 text-muted-foreground transition-colors hover:text-foreground'
								: btnNavNoHover
						}
						title={t('titleBar.navigateForward')}
					>
						<ArrowRight
							className={isMac ? 'h-[16px] w-[16px]' : 'h-[18px] w-[18px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}
			</TitleBarLeftContainer>

			{/* ── Center: app title (absolutely placed so it's always truly centered) ── */}
			<TitleBarCenterContainer>
				<TitleBarCenterContainerTitle>{titleBarTitle}</TitleBarCenterContainerTitle>
			</TitleBarCenterContainer>

			{/* ── Spacer (pushes right buttons to the right) ── */}
			<div className="flex-1" />

			{/* ── Right: minimize / maximize / close (Windows only) ── */}
			{!isMac && (
				<TitleBarRightContainer>
					<button
						type="button"
						onClick={() => window.win?.minimize()}
						className={btnBase}
						title={t('titleBar.minimize')}
					>
						<Minus className="h-[17px] w-[17px]" strokeWidth={1.5} />
					</button>

					<button
						type="button"
						onClick={() => window.win?.maximize()}
						className={btnBase}
						title={isMaximized ? t('titleBar.restore') : t('titleBar.maximize')}
					>
						{isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
					</button>

					<button
						type="button"
						onClick={() => window.win?.close()}
						className={`
              flex items-center justify-center h-full w-[46px]
              text-muted-foreground
              hover:bg-[#e81123] hover:text-white
              active:bg-[#c42b1c] active:text-white
              transition-colors duration-100
            `}
						title={t('titleBar.close')}
					>
						<X className="h-[17px] w-[17px]" strokeWidth={1.5} />
					</button>
				</TitleBarRightContainer>
			)}
		</TitleBarContainer>
	);
});
TitleBar.displayName = 'TitleBar';
