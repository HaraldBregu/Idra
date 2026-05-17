import React, { useState, useEffect, type ReactNode } from 'react';
import {
	Menu,
	Maximize2,
	PanelLeft,
	Minus,
	X,
	ArrowLeft,
	ArrowRight,
	Home,
	Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { TitleBarRightContainer } from './TitleBarRightContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SETTINGS_DETAIL_ITEMS, SETTINGS_NAVIGATION } from '@/pages/settings/navigation';

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
	const [settingsSearch, setSettingsSearch] = useState('');
	const [isSettingsSearchOpen, setIsSettingsSearchOpen] = useState(false);

	const isHome = location.pathname === '/home';
	const isStart = location.pathname === '/start';
	const isSettings = location.pathname.startsWith('/settings');
	const titleBarTitle = isSettings ? t('settings.title', 'Settings') : title;
	const homeButtonLabel = t('titleBar.home', 'Home');
	const settingsSearchPlaceholder = t('settings.searchPlaceholder', 'Search settings');
	const settingsSearchQuery = settingsSearch.trim().toLowerCase();
	const settingsSearchItems = [
		...SETTINGS_NAVIGATION.map((item) => ({
			path: item.path,
			label: t(item.labelKey),
			description: t(item.descriptionKey),
			keywords: '',
		})),
		...SETTINGS_DETAIL_ITEMS.map((item) => ({
			path: item.path,
			label: t(item.labelKey),
			description: item.descriptionKey ? t(item.descriptionKey) : '',
			keywords: item.keywords ?? '',
		})),
	]
		.filter((item) => {
			if (!settingsSearchQuery) return true;
			const searchText = `${item.label} ${item.description} ${item.keywords}`.toLowerCase();
			return searchText.includes(settingsSearchQuery);
		})
		.slice(0, 8);
	const settingsSearchTarget =
		settingsSearchQuery && settingsSearchItems.length > 0 ? settingsSearchItems[0]?.path : undefined;
	const showSettingsSearchDropdown = isSettingsSearchOpen && settingsSearchItems.length > 0;

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

				{!isHome && !isStart && !isSettings && (
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
				{isSettings ? (
					<div
						className="pointer-events-auto flex h-full items-center"
						style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
					>
						<div className="relative w-[min(360px,42vw)] min-w-56">
							<Field orientation="horizontal">
								<Input
									type="search"
									value={settingsSearch}
									onChange={(event) => {
										setSettingsSearch(event.target.value);
										setIsSettingsSearchOpen(true);
									}}
									onFocus={() => setIsSettingsSearchOpen(true)}
									onBlur={() => {
										window.setTimeout(() => setIsSettingsSearchOpen(false), 120);
									}}
									onKeyDown={(event) => {
										if (event.key !== 'Enter') return;

										event.preventDefault();
										navigate(settingsSearchTarget ?? '/settings');
										setSettingsSearch('');
									}}
									placeholder={settingsSearchPlaceholder}
									aria-label={settingsSearchPlaceholder}
									className="h-7 rounded-md border-border/70 bg-background/80 py-0 px-2 text-xs leading-none shadow-none ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring/35 focus-visible:ring-offset-0 md:text-xs"
									style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
								/>
							</Field>
							{showSettingsSearchDropdown ? (
								<div
									className="absolute left-0 right-0 top-8 z-[60] overflow-hidden rounded-lg border border-border/80 bg-popover p-1 text-popover-foreground shadow-lg"
									style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
								>
									{settingsSearchItems.map((item) => (
										<Button
											key={item.path}
											type="button"
											variant="ghost"
											size="sm"
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => {
												navigate(item.path);
												setSettingsSearch('');
												setIsSettingsSearchOpen(false);
											}}
											className="h-auto w-full justify-start rounded-md px-2 py-1.5 text-left"
										>
											<span className="min-w-0">
												<span className="block truncate text-xs font-medium">{item.label}</span>
												<span className="block truncate text-[11px] text-muted-foreground">
													{item.description}
												</span>
											</span>
										</Button>
									))}
								</div>
							) : null}
						</div>
					</div>
				) : centerContent ? (
					centerContent
				) : (
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
					className="z-10 mr-3 flex h-full items-center"
					style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
				>
					{isSettings ? (
						<Button
							type="button"
							variant="secondary"
							size="icon"
							className="size-8 rounded-full"
							onClick={() => navigate('/home')}
							title={homeButtonLabel}
							aria-label={homeButtonLabel}
						>
							<Home className="size-4" strokeWidth={1.8} />
						</Button>
					) : (
						<Button
							type="button"
							variant="secondary"
							size="icon"
							className="size-8 rounded-full"
							onClick={() => navigate('/settings')}
							title={t('settings.title', 'Settings')}
							aria-label={t('settings.title', 'Settings')}
						>
							<Settings className="size-4" strokeWidth={1.8} />
						</Button>
					)}
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
