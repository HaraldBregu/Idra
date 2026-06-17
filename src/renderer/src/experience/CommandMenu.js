import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Home, Settings, } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut, } from '@/components/ui/command';
import { SETTINGS_DETAIL_ITEMS, SETTINGS_NAVIGATION } from '@/pages/settings/navigation';
const TOP_LEVEL_ROUTES = [
    {
        id: 'route-home',
        label: 'Home',
        description: 'Chat with Friday',
        icon: Home,
        path: '/home',
        keywords: 'chat agent ai assistant friday',
    },
    {
        id: 'route-settings',
        label: 'Settings',
        description: 'Configure Friday',
        icon: Settings,
        path: '/settings',
        keywords: 'preferences configuration settings',
    },
];
function toKeywords(...values) {
    const seen = new Set();
    const keywords = [];
    for (const value of values) {
        for (const token of (value ?? '').toLowerCase().split(/[\s/._:-]+/)) {
            if (!token || seen.has(token))
                continue;
            seen.add(token);
            keywords.push(token);
        }
    }
    return keywords;
}
function createCommandItem({ id, label, description, group, icon, path, keywords, }) {
    const keywordList = toKeywords(label, description, keywords);
    return {
        id,
        label,
        description,
        group,
        icon,
        path,
        keywords: keywordList,
        searchValue: [label, description, keywords].filter(Boolean).join(' '),
    };
}
function getSettingsRouteIcon(path) {
    return SETTINGS_NAVIGATION.find((item) => path === item.path || path.startsWith(`${item.path}/`))?.icon ?? Settings;
}
function buildCommandGroups(t) {
    const routesHeading = t('command.groups.routes', 'Routes');
    const settingsRoutesHeading = t('command.groups.settingsRoutes', 'Settings routes');
    const settingsPagePaths = new Set(SETTINGS_NAVIGATION.map((item) => item.path));
    const routes = TOP_LEVEL_ROUTES.map((route) => createCommandItem({
        ...route,
        group: routesHeading,
    }));
    const settingsRoutes = SETTINGS_NAVIGATION.map((item) => createCommandItem({
        id: `settings-route-${item.path}`,
        label: t(item.labelKey),
        description: t(item.descriptionKey),
        group: settingsRoutesHeading,
        icon: item.icon,
        path: item.path,
    }));
    const settingsSubroutes = SETTINGS_DETAIL_ITEMS
        .filter((item) => item.path.startsWith('/settings/') && !settingsPagePaths.has(item.path))
        .map((item) => createCommandItem({
        id: `settings-subroute-${item.path}`,
        label: t(item.labelKey),
        description: item.descriptionKey ? t(item.descriptionKey) : undefined,
        group: settingsRoutesHeading,
        icon: item.icon ?? getSettingsRouteIcon(item.path),
        path: item.path,
        keywords: item.keywords,
    }));
    return [
        { heading: routesHeading, items: routes },
        { heading: settingsRoutesHeading, items: [...settingsRoutes, ...settingsSubroutes] },
    ];
}
export function CommandMenu() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const groups = useMemo(() => buildCommandGroups(t), [t]);
    const handleOpenChange = useCallback((nextOpen) => {
        setOpen(nextOpen);
    }, []);
    const navigateTo = useCallback((path) => {
        setOpen(false);
        navigate(path);
    }, [navigate]);
    useEffect(() => {
        const handler = (e) => {
            const isSearchShortcut = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f';
            if (isSearchShortcut) {
                e.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);
    return (_jsxs(CommandDialog, { open: open, onOpenChange: handleOpenChange, label: t('command.label', 'Route search'), loop: true, children: [_jsx(CommandInput, { placeholder: t('command.placeholder', 'Search routes and settings...') }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: t('command.empty', 'No matching route or setting.') }), groups.map((group) => (_jsx(CommandGroup, { heading: group.heading, children: group.items.map((item) => {
                            const Icon = item.icon;
                            return (_jsxs(CommandItem, { value: item.searchValue, keywords: item.keywords, onSelect: () => navigateTo(item.path), className: "items-start gap-2 px-2 py-1.5", children: [_jsx("span", { className: "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground", children: _jsx(Icon, { className: "size-3", "aria-hidden": "true", strokeWidth: 1.8 }) }), _jsxs("span", { className: "flex min-w-0 flex-1 flex-col", children: [_jsx("span", { className: "truncate text-xs font-medium leading-4", children: item.label }), item.description && (_jsx("span", { className: "truncate text-[10px] leading-3.5 text-muted-foreground", children: item.description }))] }), _jsx(CommandShortcut, { className: "hidden max-w-32 truncate font-mono text-[9px] sm:block", children: item.path })] }, item.id));
                        }) }, group.heading)))] })] }));
}
