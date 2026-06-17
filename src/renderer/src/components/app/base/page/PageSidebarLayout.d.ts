import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { TooltipContent } from '@/components/ui/tooltip';
declare function PageSidebarLayoutContainer({ className, style, children, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayout({ side, variant, collapsible, className, children, dir, ...props }: React.ComponentProps<'div'> & {
    side?: 'left' | 'right';
    variant?: 'sidebar' | 'floating' | 'inset';
    collapsible?: 'offcanvas' | 'icon' | 'none';
}): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutRail({ className, ...props }: React.ComponentProps<'button'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutInset({ className, ...props }: React.ComponentProps<'main'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutInput({ className, ...props }: React.ComponentProps<typeof Input>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutHeader({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutFooter({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutSeparator({ className, ...props }: React.ComponentProps<typeof Separator>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutContent({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutGroup({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PageSidebarLayoutGroupLabel({ className, render, ...props }: useRender.ComponentProps<'div'> & React.ComponentProps<'div'>): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function PageSidebarLayoutGroupAction({ className, render, ...props }: useRender.ComponentProps<'button'> & React.ComponentProps<'button'>): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
declare function PageSidebarLayoutGroupContent({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
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
export { PageSidebarLayout, PageSidebarLayoutContainer, PageSidebarLayoutContent, PageSidebarLayoutFooter, PageSidebarLayoutGroup, PageSidebarLayoutGroupAction, PageSidebarLayoutGroupContent, PageSidebarLayoutGroupLabel, PageSidebarLayoutHeader, PageSidebarLayoutInput, PageSidebarLayoutInset, PageSidebarLayoutMenu, PageSidebarLayoutMenuAction, PageSidebarLayoutMenuBadge, PageSidebarLayoutMenuButton, PageSidebarLayoutMenuItem, PageSidebarLayoutMenuSkeleton, PageSidebarLayoutMenuSub, PageSidebarLayoutMenuSubButton, PageSidebarLayoutMenuSubItem, PageSidebarLayoutRail, PageSidebarLayoutSeparator, PageSidebarLayoutTrigger, };
