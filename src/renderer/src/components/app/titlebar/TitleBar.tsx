import React, { useState, useEffect, type ReactNode } from 'react';
import {
	Menu,
	Maximize2,
	PanelLeft,
	Minus,
	X,
	ArrowLeft,
	ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { TitleBarRightContainer } from './TitleBarRightContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Synchronous platform check — no hooks, no async, no state.
// macOS uses native traffic-light buttons; every other OS needs custom controls.
const isMac =
	typeof navigator !== 'undefined' &&
	(navigator.platform === 'MacIntel' || navigator.platform.startsWith('Mac'));

export interface TitleBarProps {
	/** Optional class applied to the title bar container */
	className?: string;
	/** Optional inline style applied to the title bar container */
	style?: React.CSSProperties;
	/** Text displayed centered in the title bar */
	title?: string;
	/** Custom content rendered in the center, replaces the title */
	centerContent?: ReactNode;
	/** Custom content rendered on the right before window controls */
	rightContent?: ReactNode;
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
	className,
	style,
	title = 'Application Name',
	centerContent,
	rightContent,
	onToggleSidebar,
	onNavigateBack,
	onNavigateForward,
	showSidebarToggles: _showSidebarToggles = false,
}: TitleBarProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [isMaximized, setIsMaximized] = useState(false);

	const isHome = location.pathname === '/home';
	const isStart = location.pathname === '/start';
	const isSettings = location.pathname.startsWith('/settings');
	const titleBarTitle = isSettings ? t('settings.title', 'Settings') : title;
	const homeButtonLabel = isSettings ? 'Friday' : t('titleBar.home', 'Home');

	useEffect(() => {
		if (!window.win) return;

		window.win.isFullScreen().then(setIsFullScreen);
		window.win.isMaximized().then(setIsMaximized);

		const unsubFs = window.win.onFullScreenChange(setIsFullScreen);
		const unsubMax = window.win.onMaximizeChange(setIsMaximized);
		return () => {
			unsubFs();
			unsubMax();
		};
	}, []);

	const btnBase = `
    flex items-center justify-center h-full w-[46px]
    text-muted-foreground
    hover:bg-accent/80 hover:text-foreground
    active:bg-accent
    transition-colors duration-100
  `;

	const leftButtonClass =
		'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100';

	const leftButtonNoHoverClass =
		'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground';

	const leftNavButtonClass =
		'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-accent/80 hover:text-foreground';

	return (
		<TitleBarContainer className={className} style={style}>
			{/* ── Left: burger menu (Windows) + optional sidebar toggle ── */}
			<TitleBarLeftContainer isMac={isMac} isFullScreen={isFullScreen}>
				{!isMac && (
					<button
						type="button"
						onClick={() => window.win?.popupMenu()}
						className={cn(
							'ml-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground'
						)}
						title={t('titleBar.applicationMenu')}
					>
						<Menu className="h-[15px] w-[15px]" strokeWidth={1.5} />
					</button>
				)}

				{!isHome && !isStart && (
					<Button
						type="button"
						variant="default"
						size="xs"
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
						className={isMac ? leftButtonClass : leftButtonNoHoverClass}
						title={t('titleBar.toggleSidebar')}
					>
						<PanelLeft className="h-[15px] w-[15px]" strokeWidth={1.5} />
					</button>
				)}

				{onNavigateBack && (
					<button
						type="button"
						onClick={onNavigateBack}
						className={leftNavButtonClass}
						title={t('titleBar.navigateBack')}
					>
						<ArrowLeft className="h-[15px] w-[15px]" strokeWidth={1.5} />
					</button>
				)}

				{onNavigateForward && (
					<button
						type="button"
						onClick={onNavigateForward}
						className={leftNavButtonClass}
						title={t('titleBar.navigateForward')}
					>
						<ArrowRight className="h-[15px] w-[15px]" strokeWidth={1.5} />
					</button>
				)}
			</TitleBarLeftContainer>

			{/* ── Center: app title (absolutely placed so it's always truly centered) ── */}
			<TitleBarCenterContainer>
				{centerContent ?? (
					<TitleBarCenterContainerTitle>{titleBarTitle}</TitleBarCenterContainerTitle>
				)}
			</TitleBarCenterContainer>

			{/* ── Spacer (pushes right buttons to the right) ── */}
			<div className="flex-1" />

			{rightContent ? (
				<div
					className="z-10 mr-3 flex h-full items-center"
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
					{rightContent}
				</div>
			) : null}

			{!isStart && (
				<div
					className="z-10 mr-5 flex h-full items-center"
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
					<Button
						type="button"
						onClick={() => navigate('/settings')}
						variant="secondary"
						size="icon"
						className="size-8 rounded-full text-xs font-bold"
						aria-label={t('settings.title', 'Settings')}
						title={t('settings.title', 'Settings')}
					>
						AR
					</Button>
				</div>
			)}

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
						title={
							isMaximized ? t('titleBar.restore', 'Restore') : t('titleBar.maximize', 'Maximize')
						}
					>
						<Maximize2 className="h-[15px] w-[15px]" strokeWidth={1.5} />
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
