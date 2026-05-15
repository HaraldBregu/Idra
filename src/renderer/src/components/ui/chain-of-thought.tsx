'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type ChainOfThoughtProps = {
	children: React.ReactNode;
	className?: string;
};

function ChainOfThought({ children, className }: ChainOfThoughtProps) {
	const childArray = React.Children.toArray(children);
	return (
		<div className={cn('flex flex-col', className)}>
			{childArray.map((child, idx) => {
				if (!React.isValidElement(child)) return child;
				return React.cloneElement(child as React.ReactElement<{ isLast?: boolean }>, {
					isLast: idx === childArray.length - 1,
				});
			})}
		</div>
	);
}

export type ChainOfThoughtStepProps = {
	children: React.ReactNode;
	className?: string;
	isLast?: boolean;
} & React.ComponentProps<typeof Collapsible>;

function ChainOfThoughtStep({
	children,
	className,
	isLast,
	...props
}: ChainOfThoughtStepProps) {
	return (
		<div className={cn('relative flex gap-3', className)}>
			<div className="flex w-4 shrink-0 flex-col items-center pt-1.5">
				<span className="size-2 rounded-full bg-muted-foreground/40" />
				{!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
			</div>
			<div className="flex-1 pb-3">
				<Collapsible {...props}>{children}</Collapsible>
			</div>
		</div>
	);
}

export type ChainOfThoughtTriggerProps = {
	children: React.ReactNode;
	leftIcon?: React.ReactNode;
	swapIconOnHover?: boolean;
	className?: string;
} & React.ComponentProps<typeof CollapsibleTrigger>;

function ChainOfThoughtTrigger({
	children,
	leftIcon,
	swapIconOnHover = true,
	className,
	...props
}: ChainOfThoughtTriggerProps) {
	return (
		<CollapsibleTrigger
			className={cn(
				'group inline-flex w-fit items-center gap-2 text-sm text-foreground transition-colors hover:text-foreground/80',
				className
			)}
			{...props}
		>
			{leftIcon && (
				<span
					className={cn(
						'inline-flex size-3 items-center justify-center text-muted-foreground',
						swapIconOnHover && 'group-hover:hidden'
					)}
				>
					{leftIcon}
				</span>
			)}
			<ChevronDown
				className={cn(
					'size-3 text-muted-foreground transition-transform group-data-[panel-open]:rotate-0 -rotate-90',
					leftIcon && swapIconOnHover ? 'hidden group-hover:inline-flex' : 'inline-flex'
				)}
			/>
			<span>{children}</span>
		</CollapsibleTrigger>
	);
}

export type ChainOfThoughtContentProps = React.ComponentProps<typeof CollapsibleContent>;

function ChainOfThoughtContent({ children, className, ...props }: ChainOfThoughtContentProps) {
	return (
		<CollapsibleContent
			className={cn('mt-1 flex flex-col gap-1 pl-5 text-sm', className)}
			{...props}
		>
			{children}
		</CollapsibleContent>
	);
}

export type ChainOfThoughtItemProps = React.ComponentProps<'div'>;

function ChainOfThoughtItem({ children, className, ...props }: ChainOfThoughtItemProps) {
	return (
		<div
			className={cn('flex items-start gap-2 text-sm text-muted-foreground', className)}
			{...props}
		>
			<span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
			<div className="flex-1">{children}</div>
		</div>
	);
}

export {
	ChainOfThought,
	ChainOfThoughtStep,
	ChainOfThoughtTrigger,
	ChainOfThoughtContent,
	ChainOfThoughtItem,
};
