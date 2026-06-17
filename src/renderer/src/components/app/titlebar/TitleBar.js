import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Menu, PanelLeft, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { TitleBarContainer } from './TitleBarContainer';
import { TitleBarCenterContainer } from './TitleBarCenterContainer';
import { TitleBarLeftContainer } from './TitleBarLeftContainer';
import { TitleBarCenterContainerTitle } from './TitleBarCenterContainerTitle';
import { Button } from '@/components/ui/button';
import { GradientSphere } from '@/components/ui/gradient-sphere';
import { TitleBarProvider } from './context/TitleBarContext';
import { NavButton } from './components/NavButton';
import { NavigationButtons } from './components/NavigationButtons';
import { WindowControls } from './components/WindowControls';
import { useWindowState } from './hooks/useWindowState';
// Synchronous platform check — no hooks, no async, no state.
// macOS uses native traffic-light buttons; every other OS needs custom controls.
const isMac = typeof navigator !== 'undefined' &&
    (navigator.platform === 'MacIntel' || navigator.platform.startsWith('Mac'));
export const TitleBar = React.memo(function TitleBar({ className, style, title = 'Application Name', centerContent, rightContent, onToggleSidebar, showSidebarToggles: _showSidebarToggles = false, }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { isFullScreen } = useWindowState();
    const isHome = location.pathname === '/home';
    const isStart = location.pathname === '/start';
    const isSettings = location.pathname.startsWith('/settings');
    const titleBarTitle = isSettings ? t('settings.title', 'Settings') : title;
    const homeButtonLabel = t('titleBar.home', 'Home');
    return (_jsx(TitleBarProvider, { value: { isMac, isFullScreen }, children: _jsxs(TitleBarContainer, { className: className, style: style, children: [_jsxs(TitleBarLeftContainer, { isMac: isMac, isFullScreen: isFullScreen, children: [!isMac && (_jsx("button", { type: "button", onClick: () => window.win?.popupMenu(), className: "ml-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground", title: t('titleBar.applicationMenu'), children: _jsx(Menu, { className: "h-[15px] w-[15px]", strokeWidth: 1.5 }) })), !isHome && !isStart && !isSettings && (_jsx(Button, { type: "button", variant: "default", size: "xs", onClick: () => navigate('/home'), title: homeButtonLabel, children: homeButtonLabel })), onToggleSidebar && (_jsx(NavButton, { onClick: onToggleSidebar, title: t('titleBar.toggleSidebar'), className: !isMac ? 'hover:bg-transparent hover:text-muted-foreground transition-none' : '', children: _jsx(PanelLeft, { className: "h-[15px] w-[15px]", strokeWidth: 1.5 }) })), isSettings && _jsx(NavigationButtons, {})] }), _jsx(TitleBarCenterContainer, { children: centerContent && !isSettings ? (centerContent) : (_jsx(TitleBarCenterContainerTitle, { children: titleBarTitle })) }), _jsx("div", { className: "flex-1" }), rightContent && (_jsx("div", { className: "z-10 mr-3 flex h-full items-center", style: { WebkitAppRegion: 'no-drag' }, children: rightContent })), !isStart && (_jsx("div", { className: "z-10 mr-3 flex h-full items-center", style: { WebkitAppRegion: 'no-drag' }, children: isSettings ? (_jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-8 rounded-full", onClick: () => navigate('/home'), title: homeButtonLabel, "aria-label": homeButtonLabel, children: _jsx(GradientSphere, { size: 20 }) })) : (_jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-8 rounded-full", onClick: () => navigate('/settings'), title: t('settings.title', 'Settings'), "aria-label": t('settings.title', 'Settings'), children: _jsx(User, { className: "size-4", strokeWidth: 1.8 }) })) })), !isMac && _jsx(WindowControls, {})] }) }));
});
TitleBar.displayName = 'TitleBar';
