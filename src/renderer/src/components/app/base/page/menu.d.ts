import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { type VariantProps } from 'class-variance-authority';
import { TooltipContent } from '@/components/ui/tooltip';
declare function PageSidebarLayoutMenu({ className, ...props }: React.ComponentProps<'ul'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutMenuItem({ className, ...props }: React.ComponentProps<'li'>): import("react/jsx-runtime").JSX.Element;
declare const pageSidebarLayoutMenuButtonVariants: (props?: ({
    variant?: "default" | "outline" | null | undefined;
    size?: "default" | "sm" | "lg" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function PageSidebarLayoutMenuButton({ render, isActive, variant, size, tooltip, className, ...props }: useRender.ComponentProps<'button'> & React.ComponentProps<'button'> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof pageSidebarLayoutMenuButtonVariants>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutMenuAction({ className, render, showOnHover, ...props }: useRender.ComponentProps<'button'> & React.ComponentProps<'button'> & {
    showOnHover?: boolean;
}): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function PageSidebarLayoutMenuBadge({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutMenuSkeleton({ className, showIcon, ...props }: React.ComponentProps<'div'> & {
    showIcon?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutMenuSub({ className, ...props }: React.ComponentProps<'ul'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutMenuSubItem({ className, ...props }: React.ComponentProps<'li'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutMenuSubButton({ render, size, isActive, className, ...props }: useRender.ComponentProps<'a'> & React.ComponentProps<'a'> & {
    size?: 'sm' | 'md';
    isActive?: boolean;
}): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
export { pageSidebarLayoutMenuButtonVariants, PageSidebarLayoutMenu, PageSidebarLayoutMenuAction, PageSidebarLayoutMenuBadge, PageSidebarLayoutMenuButton, PageSidebarLayoutMenuItem, PageSidebarLayoutMenuSkeleton, PageSidebarLayoutMenuSub, PageSidebarLayoutMenuSubButton, PageSidebarLayoutMenuSubItem, };
