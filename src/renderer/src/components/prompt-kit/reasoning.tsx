'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Markdown } from './markdown';

type ReasoningContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
};

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null);

function useReasoning() {
	const ctx = React.useContext(ReasoningContext);
	if (!ctx) throw new Error('Reasoning subcomponents must be used inside <Reasoning>');
	return ctx;
}

export type ReasoningProps = {
	children: React.ReactNode;
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	isStreaming?: boolean;
};

function Reasoning({ children, className, open, onOpenChange, isStreaming }: ReasoningProps) {
	const isControlled = open !== undefined;
	const [internalOpen, setInternalOpen] = React.useState<boolean>(isStreaming ?? false);
	const wasStreaming = React.useRef<boolean>(isStreaming ?? false);

	React.useEffect(() => {
		if (isControlled) return;
		if (isStreaming && !wasStreaming.current) setInternalOpen(true);
		if (!isStreaming && wasStreaming.current) setInternalOpen(false);
		wasStreaming.current = isStreaming ?? false;
	}, [isStreaming, isControlled]);

	const currentOpen = isControlled ? !!open : internalOpen;
	const setOpen = (next: boolean) => {
		if (!isControlled) setInternalOpen(next);
		onOpenChange?.(next);
	};

	return (
		<ReasoningContext.Provider value={{ open: currentOpen, setOpen }}>
			<div className={cn('flex flex-col gap-1', className)}>{children}</div>
		</ReasoningContext.Provider>
	);
}

export type ReasoningTriggerProps = {
	children: React.ReactNode;
	className?: string;
} & React.HTMLAttributes<HTMLButtonElement>;

function ReasoningTrigger({ children, className, onClick, ...props }: ReasoningTriggerProps) {
	const { open, setOpen } = useReasoning();
	return (
		<button
			type="button"
			aria-expanded={open}
			onClick={(e) => {
				setOpen(!open);
				onClick?.(e);
			}}
			className={cn(
				'inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
				className
			)}
			{...props}
		>
			<ChevronDown
				className={cn('size-3 transition-transform', open ? 'rotate-0' : '-rotate-90')}
			/>
			{children}
		</button>
	);
}

export type ReasoningContentProps = {
	children: React.ReactNode;
	className?: string;
	contentClassName?: string;
	markdown?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

function ReasoningContent({
	children,
	className,
	contentClassName,
	markdown = false,
	...props
}: ReasoningContentProps) {
	const { open } = useReasoning();
	return (
		<div
			data-state={open ? 'open' : 'closed'}
			className={cn(
				'grid overflow-hidden transition-all duration-200 ease-out',
				open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
				className
			)}
			{...props}
		>
			<div className="min-h-0 overflow-hidden">
				{markdown ? (
					<Markdown className={cn('text-sm text-muted-foreground', contentClassName)}>
						{children as string}
					</Markdown>
				) : (
					<div className={cn('text-sm text-muted-foreground', contentClassName)}>
						{children}
					</div>
				)}
			</div>
		</div>
	);
}

export { Reasoning, ReasoningTrigger, ReasoningContent };
