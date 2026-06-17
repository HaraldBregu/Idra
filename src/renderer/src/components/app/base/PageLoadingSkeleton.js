import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer, PageHeader, PageHeaderTitle, PageBody } from './page';
export const PageLoadingSkeleton = React.memo(function PageLoadingSkeleton() {
    return (_jsxs(PageContainer, { children: [_jsx(PageHeader, { children: _jsx(PageHeaderTitle, { children: _jsx(Skeleton, { className: "h-6 w-48" }) }) }), _jsx(PageBody, { className: "p-6", children: _jsxs("div", { className: "flex flex-col gap-4 max-w-3xl", children: [_jsx(Skeleton, { className: "h-8 w-1/2" }), _jsx(Skeleton, { className: "h-4 w-2/3" }), _jsxs("div", { className: "space-y-2 pt-4", children: [_jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-11/12" }), _jsx(Skeleton, { className: "h-3 w-10/12" }), _jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-9/12" })] })] }) })] }));
});
PageLoadingSkeleton.displayName = 'PageLoadingSkeleton';
export const HomePageLoadingSkeleton = React.memo(function HomePageLoadingSkeleton() {
    return (_jsx(PageContainer, { className: "overflow-hidden text-foreground", children: _jsxs("div", { className: "relative flex min-h-0 flex-1 flex-col bg-background", children: [_jsx("div", { className: "mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center px-4 pb-32", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsx(Skeleton, { className: "mx-auto h-5 w-44 max-w-full" }), _jsx(Skeleton, { className: "mx-auto mt-3 h-3 w-64 max-w-full" })] }) }), _jsx("div", { className: "absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 py-3", children: _jsxs("div", { className: "w-full max-w-[96rem] rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm shadow-foreground/5", children: [_jsx(Skeleton, { className: "h-4 w-32 max-w-full" }), _jsxs("div", { className: "mt-4 flex items-center gap-2", children: [_jsx(Skeleton, { className: "size-8 rounded-full" }), _jsx(Skeleton, { className: "h-9 flex-1 rounded-full" }), _jsx(Skeleton, { className: "size-9 rounded-full" })] })] }) })] }) }));
});
HomePageLoadingSkeleton.displayName = 'HomePageLoadingSkeleton';
