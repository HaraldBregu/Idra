import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Provider } from './Provider';
import { usePageContext } from './hooks/use-page-context';
export const PageContainer = memo(function PageContainer({ children, className, initialState, }) {
    return (_jsx(Provider, { initialState: initialState, children: _jsx("div", { className: cn('flex h-full flex-col bg-transparent', className), style: {
                backgroundColor: 'var(--page-background)',
            }, children: children }) }));
});
export const PageHeader = memo(function PageHeader({ children, className, }) {
    const { state } = usePageContext();
    if (!state.isHeaderVisible)
        return null;
    return (_jsx("div", { className: cn('app-translucent-surface flex shrink-0 flex-col border-b px-6 py-2 gap-1', className), style: {
            backgroundColor: 'var(--page-header-background, var(--app-surface-background))',
        }, children: children }));
});
export const PageHeaderTitle = memo(function PageHeaderTitle({ children, className, }) {
    return (_jsx("h1", { className: cn('text-md font-medium flex items-center gap-2 flex-1 min-w-0', className), children: children }));
});
export const PageHeaderDescription = memo(function PageHeaderDescription({ children, className, }) {
    return (_jsx("p", { className: cn('text-sm text-muted-foreground flex items-center gap-3 flex-1 min-w-0', className), children: children }));
});
export const PageBody = memo(function PageBody({ children, className, }) {
    return (_jsx("div", { className: cn('flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 pt-16', className), children: children }));
});
export const PageSidebar = memo(function PageSidebar({ children, className, }) {
    const { state } = usePageContext();
    if (!state.isSidebarVisible)
        return null;
    return (_jsx("aside", { className: cn('flex shrink-0 flex-col overflow-y-auto py-2', state.sidebarSide === 'left' ? 'order-first border-r' : 'order-last border-l', className), children: children }));
});
export const PageSidebarInset = memo(function PageSidebarInset({ children, className, }) {
    return (_jsx("div", { className: cn('flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-2', className), children: children }));
});
