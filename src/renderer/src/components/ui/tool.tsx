'use client';

import * as React from 'react';
import { CheckCircle, ChevronDown, Loader2, Settings, XCircle } from 'lucide-react';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type ToolPart = {
	type: string;
	state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
	input?: unknown;
	inputText?: string;
	output?: unknown;
	outputText?: string;
	toolCallId?: string;
	errorText?: string;
};

export type ToolProps = {
	toolPart: ToolPart;
	defaultOpen?: boolean;
	className?: string;
};

function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	if (typeof value === 'object') return JSON.stringify(value, null, 2);
	return String(value);
}

function stateMeta(state: ToolPart['state']): {
	label: string;
	icon: React.ReactNode;
	className: string;
} {
	switch (state) {
		case 'input-streaming':
			return {
				label: 'Processing',
				icon: <Loader2 className="size-3.5 animate-spin" />,
				className: 'bg-muted text-muted-foreground',
			};
		case 'input-available':
			return {
				label: 'Ready',
				icon: <Settings className="size-3.5" />,
				className: 'bg-info/10 text-info',
			};
		case 'output-available':
			return {
				label: 'Completed',
				icon: <CheckCircle className="size-3.5" />,
				className: 'bg-success/10 text-success',
			};
		case 'output-error':
			return {
				label: 'Error',
				icon: <XCircle className="size-3.5" />,
				className: 'bg-destructive/10 text-destructive',
			};
	}
}

function Tool({ toolPart, defaultOpen = false, className }: ToolProps) {
	const [isOpen, setIsOpen] = React.useState(defaultOpen);
	const meta = stateMeta(toolPart.state);
	const input = toolPart.input ?? toolPart.inputText;
	const output = toolPart.output ?? toolPart.outputText;

	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className={cn('rounded-lg border border-border bg-background/80 text-foreground', className)}
		>
			<CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
					{meta.icon}
				</span>
				<span className="min-w-0 flex-1 truncate text-sm font-semibold">{toolPart.type}</span>
				<span
					className={cn(
						'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold',
						meta.className
					)}
				>
					{meta.label}
				</span>
				<ChevronDown
					className={cn(
						'size-4 shrink-0 text-muted-foreground transition-transform',
						isOpen && 'rotate-180'
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t border-border px-3 py-3">
				<div className="flex flex-col gap-3">
					{input !== undefined && (
						<section className="flex flex-col gap-1.5">
							<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Input
							</h4>
							<pre className="max-h-56 overflow-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
								{formatValue(input)}
							</pre>
						</section>
					)}
					{output !== undefined && (
						<section className="flex flex-col gap-1.5">
							<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Output
							</h4>
							<pre className="max-h-56 overflow-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
								{formatValue(output)}
							</pre>
						</section>
					)}
					{toolPart.state === 'output-error' && toolPart.errorText && (
						<section className="flex flex-col gap-1.5">
							<h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">
								Error
							</h4>
							<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
								{toolPart.errorText}
							</p>
						</section>
					)}
					{toolPart.toolCallId && (
						<p className="font-mono text-[11px] text-muted-foreground">
							Call ID: {toolPart.toolCallId}
						</p>
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export { Tool };
