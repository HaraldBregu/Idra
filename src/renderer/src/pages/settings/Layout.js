import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ChevronRight, Settings } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { useTranslation } from 'react-i18next';
import { useSettingsBreadcrumbItems } from './hooks';
function SettingsBreadcrumbHeader() {
    const { t } = useTranslation();
    const items = useSettingsBreadcrumbItems();
    if (items.length === 0)
        return null;
    return (_jsx("header", { className: "sticky top-0 z-20 border-b border-border/50 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80", children: _jsxs("nav", { "aria-label": t('settings.breadcrumb.label'), className: "mx-auto flex w-full max-w-4xl min-w-0 items-center gap-1 text-[11px] text-muted-foreground", children: [_jsx(Settings, { className: "size-3 shrink-0", strokeWidth: 1.8 }), _jsx(Link, { to: "/settings", className: "min-w-0 rounded-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55", children: t('settings.title') }), items.map((item, index) => (_jsxs(React.Fragment, { children: [_jsx(ChevronRight, { className: "size-3 shrink-0 text-muted-foreground/60", strokeWidth: 1.8 }), item.path ? (_jsx(Link, { to: item.path, className: "min-w-0 rounded-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/55", children: item.label })) : (_jsx("span", { className: "min-w-0 truncate font-medium text-foreground", children: item.label }))] }, `${item.label}-${index}`)))] }) }));
}
export function Layout() {
    return (_jsx(PageContainer, { className: "bg-muted/20", children: _jsxs("main", { className: "min-h-0 flex-1 overflow-y-auto", children: [_jsx(SettingsBreadcrumbHeader, {}), _jsx("div", { className: "px-4 py-6", children: _jsx(Outlet, {}) })] }) }));
}
