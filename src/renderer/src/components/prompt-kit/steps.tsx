'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type StepsItemProps = React.ComponentProps<'div'>;

function StepsItem({ children, className, ...props }: StepsItemProps) {
	return (
		<div className={cn('relative flex gap-3', className)} {...props}>
			{children}
		</div>
	);
}

export type StepsTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
	leftIcon?: React.ReactNode;
	swapIconOnHover?: boolean;
};

function StepsTrigger({
	children,
	className,
	leftIcon,
	swapIconOnHover = true,
	...props
}: StepsTriggerProps) {
	return (
		<CollapsibleTrigger
			className={cn(
				'group inline-flex w-fit items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground',
				className
			)}
			{...props}
		>
			{leftIcon ? (
				<span className="inline-grid size-4 place-items-center">
					<span className={cn('text-muted-foreground', swapIconOnHover && 'group-hover:hidden')}>
						{leftIcon}
					</span>
					{swapIconOnHover && (
						<ChevronDown className="hidden size-3 text-muted-foreground transition-transform group-data-[panel-open]:rotate-0 -rotate-90 group-hover:block" />
					)}
				</span>
			) : (
				<ChevronDown className="size-3 text-muted-foreground transition-transform group-data-[panel-open]:rotate-0 -rotate-90" />
			)}
			<span>{children}</span>
		</CollapsibleTrigger>
	);
}

export type StepsContentProps = React.ComponentProps<typeof CollapsibleContent> & {
	bar?: React.ReactNode;
};

function StepsContent({ children, className, bar, ...props }: StepsContentProps) {
	return (
		<CollapsibleContent className={cn('mt-2', className)} {...props}>
			<div className="relative pl-5">
				{bar ?? <StepsBar />}
				<div className="flex flex-col gap-2">{children}</div>
			</div>
		</CollapsibleContent>
	);
}

export type StepsBarProps = React.HTMLAttributes<HTMLSpanElement>;

function StepsBar({ className, ...props }: StepsBarProps) {
	return (
		<span
			aria-hidden
			className={cn('absolute bottom-1 left-1.5 top-1 w-px bg-border', className)}
			{...props}
		/>
	);
}

export type StepsProps = React.ComponentProps<typeof Collapsible> & {
	defaultOpen?: boolean;
};

function Steps({ defaultOpen = true, className, ...props }: StepsProps) {
	return (
		<Collapsible defaultOpen={defaultOpen} className={cn('flex flex-col', className)} {...props} />
	);
}

export { Steps, StepsBar, StepsContent, StepsItem, StepsTrigger };
