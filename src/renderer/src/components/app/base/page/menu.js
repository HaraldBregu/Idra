'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePageContext } from './hooks/use-page-context';
function PageSidebarLayoutMenu({ className, ...props }) {
    return (_jsx("ul", { "data-slot": "sidebar-menu", "data-sidebar": "menu", className: cn('flex w-full min-w-0 flex-col gap-0', className), ...props }));
}
function PageSidebarLayoutMenuItem({ className, ...props }) {
    return (_jsx("li", { "data-slot": "sidebar-menu-item", "data-sidebar": "menu-item", className: cn('group/menu-item relative', className), ...props }));
}
const pageSidebarLayoutMenuButtonVariants = cva('peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate', {
    variants: {
        variant: {
            default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            outline: 'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
        },
        size: {
            default: 'h-8 text-sm',
            sm: 'h-7 text-xs',
            lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});
function PageSidebarLayoutMenuButton({ render, isActive = false, variant = 'default', size = 'default', tooltip, className, ...props }) {
    const { state, isMobile } = usePageContext();
    const sidebarLayoutState = state.sidebarOpen ? 'expanded' : 'collapsed';
    const comp = useRender({
        defaultTagName: 'button',
        props: mergeProps({
            className: cn(pageSidebarLayoutMenuButtonVariants({ variant, size }), className),
        }, props),
        render: !tooltip ? render : _jsx(TooltipTrigger, { render: render }),
        state: {
            slot: 'sidebar-menu-button',
            sidebar: 'menu-button',
            size,
            active: isActive,
        },
    });
    if (!tooltip) {
        return comp;
    }
    if (typeof tooltip === 'string') {
        tooltip = {
            children: tooltip,
        };
    }
    return (_jsxs(Tooltip, { children: [comp, _jsx(TooltipContent, { side: "right", align: "center", hidden: sidebarLayoutState !== 'collapsed' || isMobile, ...tooltip })] }));
}
function PageSidebarLayoutMenuAction({ className, render, showOnHover = false, ...props }) {
    return useRender({
        defaultTagName: 'button',
        props: mergeProps({
            className: cn('absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0', showOnHover &&
                'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0', className),
        }, props),
        render,
        state: {
            slot: 'sidebar-menu-action',
            sidebar: 'menu-action',
        },
    });
}
function PageSidebarLayoutMenuBadge({ className, ...props }) {
    return (_jsx("div", { "data-slot": "sidebar-menu-badge", "data-sidebar": "menu-badge", className: cn('pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground', className), ...props }));
}
function PageSidebarLayoutMenuSkeleton({ className, showIcon = false, ...props }) {
    const [width] = React.useState(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`;
    });
    return (_jsxs("div", { "data-slot": "sidebar-menu-skeleton", "data-sidebar": "menu-skeleton", className: cn('flex h-8 items-center gap-2 rounded-md px-2', className), ...props, children: [showIcon && _jsx(Skeleton, { className: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }), _jsx(Skeleton, { className: "h-4 max-w-(--skeleton-width) flex-1", "data-sidebar": "menu-skeleton-text", style: {
                    '--skeleton-width': width,
                } })] }));
}
function PageSidebarLayoutMenuSub({ className, ...props }) {
    return (_jsx("ul", { "data-slot": "sidebar-menu-sub", "data-sidebar": "menu-sub", className: cn('mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden', className), ...props }));
}
function PageSidebarLayoutMenuSubItem({ className, ...props }) {
    return (_jsx("li", { "data-slot": "sidebar-menu-sub-item", "data-sidebar": "menu-sub-item", className: cn('group/menu-sub-item relative', className), ...props }));
}
function PageSidebarLayoutMenuSubButton({ render, size = 'md', isActive = false, className, ...props }) {
    return useRender({
        defaultTagName: 'a',
        props: mergeProps({
            className: cn('flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground', className),
        }, props),
        render,
        state: {
            slot: 'sidebar-menu-sub-button',
            sidebar: 'menu-sub-button',
            size,
            active: isActive,
        },
    });
}
export { pageSidebarLayoutMenuButtonVariants, PageSidebarLayoutMenu, PageSidebarLayoutMenuAction, PageSidebarLayoutMenuBadge, PageSidebarLayoutMenuButton, PageSidebarLayoutMenuItem, PageSidebarLayoutMenuSkeleton, PageSidebarLayoutMenuSub, PageSidebarLayoutMenuSubButton, PageSidebarLayoutMenuSubItem, };
