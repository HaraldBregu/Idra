'use client';

import * as React from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { PanelLeftIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { usePageContext } from './hooks/use-page-context';

const PAGE_SIDEBAR_LAYOUT_WIDTH = '16rem';
const PAGE_SIDEBAR_LAYOUT_WIDTH_MOBILE = '18rem';
const PAGE_SIDEBAR_LAYOUT_WIDTH_ICON = '3rem';

function PageSidebarLayoutContainer({
	className,
	style,
	children,
	...props
}: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-wrapper"
			style={
				{
					'--sidebar-width': PAGE_SIDEBAR_LAYOUT_WIDTH,
					'--sidebar-width-icon': PAGE_SIDEBAR_LAYOUT_WIDTH_ICON,
					...style,
				} as React.CSSProperties
			}
			className={cn(
				'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

function PageSidebarLayout({
	side = 'left',
	variant = 'sidebar',
	collapsible = 'offcanvas',
	className,
	children,
	dir,
	...props
}: React.ComponentProps<'div'> & {
	side?: 'left' | 'right';
	variant?: 'sidebar' | 'floating' | 'inset';
	collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
	const { state, isMobile, dispatch } = usePageContext();
	const sidebarLayoutState = state.sidebarOpen ? 'expanded' : 'collapsed';

	if (collapsible === 'none') {
		return (
			<div
				data-slot="sidebar"
				className={cn(
					'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
					className
				)}
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet
				open={state.sidebarOpenMobile}
				onOpenChange={(open) => dispatch({ type: 'SIDEBAR_OPEN_MOBILE_SET', open })}
				{...props}
			>
				<SheetContent
					dir={dir}
					data-sidebar="sidebar"
					data-slot="sidebar"
					data-mobile="true"
					className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
					style={
						{
							'--sidebar-width': PAGE_SIDEBAR_LAYOUT_WIDTH_MOBILE,
						} as React.CSSProperties
					}
					side={side}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Sidebar</SheetTitle>
						<SheetDescription>Displays the mobile sidebar.</SheetDescription>
					</SheetHeader>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<div
			className="group peer hidden text-sidebar-foreground md:block"
			data-state={sidebarLayoutState}
			data-collapsible={sidebarLayoutState === 'collapsed' ? collapsible : ''}
			data-variant={variant}
			data-side={side}
			data-slot="sidebar"
		>
			<div
				data-slot="sidebar-gap"
				className={cn(
					'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
					'group-data-[collapsible=offcanvas]:w-0',
					'group-data-[side=right]:rotate-180',
					variant === 'floating' || variant === 'inset'
						? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
				)}
			/>
			<div
				data-slot="sidebar-container"
				data-side={side}
				className={cn(
					'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex',
					variant === 'floating' || variant === 'inset'
						? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
						: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
					className
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
					className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
				>
					{children}
				</div>
			</div>
		</div>
	);
}

function PageSidebarLayoutTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>) {
	const { toggleSidebar } = usePageContext();

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon-sm"
			className={cn(className)}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			<PanelLeftIcon className="cn-rtl-flip" />
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
}

function PageSidebarLayoutRail({ className, ...props }: React.ComponentProps<'button'>) {
	const { toggleSidebar } = usePageContext();

	return (
		<button
			data-sidebar="rail"
			data-slot="sidebar-rail"
			aria-label="Toggle Sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			title="Toggle Sidebar"
			className={cn(
				'absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2',
				'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
				'[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
				'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
				'[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
				'[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
				className
			)}
			{...props}
		/>
	);
}

function PageSidebarLayoutInset({ className, ...props }: React.ComponentProps<'main'>) {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn(
				'relative flex w-full flex-1 flex-col bg-transparent md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
				className
			)}
			{...props}
		/>
	);
}

function PageSidebarLayoutInput({ className, ...props }: React.ComponentProps<typeof Input>) {
	return (
		<Input
			data-slot="sidebar-input"
			data-sidebar="input"
			className={cn('h-8 w-full bg-background/70 shadow-none supports-backdrop-filter:backdrop-blur-xl', className)}
			{...props}
		/>
	);
}

function PageSidebarLayoutHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	);
}

function PageSidebarLayoutFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-footer"
			data-sidebar="footer"
			className={cn('flex flex-col gap-2 p-2', className)}
			{...props}
		/>
	);
}

function PageSidebarLayoutSeparator({
	className,
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="sidebar-separator"
			data-sidebar="separator"
			className={cn('mx-2 w-auto bg-sidebar-border', className)}
			{...props}
		/>
	);
}

function PageSidebarLayoutContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="sidebar-content"
			data-sidebar="content"
			className={cn(
				'no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
				className
			)}
			{...props}
		/>
	);
}

export {
	PageSidebarLayout,
	PageSidebarLayoutContainer,
	PageSidebarLayoutContent,
	PageSidebarLayoutFooter,
	PageSidebarLayoutHeader,
	PageSidebarLayoutInput,
	PageSidebarLayoutInset,
	PageSidebarLayoutRail,
	PageSidebarLayoutSeparator,
	PageSidebarLayoutTrigger,
};

export {
	PageSidebarLayoutGroup,
	PageSidebarLayoutGroupAction,
	PageSidebarLayoutGroupContent,
	PageSidebarLayoutGroupLabel,
} from './group';

export {
	pageSidebarLayoutMenuButtonVariants,
	PageSidebarLayoutMenu,
	PageSidebarLayoutMenuAction,
	PageSidebarLayoutMenuBadge,
	PageSidebarLayoutMenuButton,
	PageSidebarLayoutMenuItem,
	PageSidebarLayoutMenuSkeleton,
	PageSidebarLayoutMenuSub,
	PageSidebarLayoutMenuSubButton,
	PageSidebarLayoutMenuSubItem,
} from './menu';
