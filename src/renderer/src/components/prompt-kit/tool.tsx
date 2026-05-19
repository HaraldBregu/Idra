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
	status?: 'ok' | 'error' | 'rejected';
	iteration?: number;
	input?: unknown;
	inputText?: string;
	output?: unknown;
	outputText?: string;
	durationMs?: number;
	toolCallId?: string;
	errorText?: string;
};

export type ToolProps = {
	toolPart: ToolPart;
	defaultOpen?: boolean;
	className?: string;
	collapsible?: boolean;
};

function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	if (typeof value === 'object') return JSON.stringify(value, null, 2);
	return String(value);
}

function formatDuration(durationMs: number): string {
	if (durationMs < 1000) return `${Math.max(0, Math.round(durationMs))}ms`;
	return `${(durationMs / 1000).toFixed(1)}s`;
}

function stateMeta(state: ToolPart['state'], status?: ToolPart['status']): {
	label: string;
	icon: React.ReactNode;
	className: string;
} {
	switch (state) {
		case 'input-streaming':
			return {
				label: 'Processing',
				icon: <Loader2 className="size-3.5 animate-spin" />,
				className: 'text-muted-foreground',
			};
		case 'input-available':
			return {
				label: 'Ready',
				icon: <Settings className="size-3.5" />,
				className: 'text-info',
			};
		case 'output-available':
			return {
				label: 'Done',
				icon: <CheckCircle className="size-3.5" />,
				className: 'text-success',
			};
		case 'output-error':
			return {
				label: status === 'rejected' ? 'Denied' : 'Error',
				icon: <XCircle className="size-3.5" />,
				className: 'text-destructive',
			};
	}
}

function ToolHeader({
	toolPart,
	isOpen,
	showChevron,
}: {
	readonly toolPart: ToolPart;
	readonly isOpen: boolean;
	readonly showChevron: boolean;
}) {
	const meta = stateMeta(toolPart.state, toolPart.status);
	const details = [
		meta.label,
		toolPart.iteration !== undefined ? `Iteration ${toolPart.iteration + 1}` : undefined,
		toolPart.durationMs !== undefined ? formatDuration(toolPart.durationMs) : undefined,
	].filter(Boolean);

	return (
		<>
			<span className={cn('shrink-0 transition-colors', meta.className)}>{meta.icon}</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-medium text-foreground">
					{toolPart.type}
				</span>
				{details.length > 0 && (
					<span className="block truncate text-[11px] text-muted-foreground">
						{details.join(' · ')}
					</span>
				)}
			</span>
			{showChevron && (
				<ChevronDown
					className={cn(
						'size-3.5 shrink-0 text-muted-foreground transition-transform',
						isOpen && 'rotate-180'
					)}
				/>
			)}
		</>
	);
}

function ToolDetails({ toolPart }: { readonly toolPart: ToolPart }) {
	const input = toolPart.input ?? toolPart.inputText;
	const output = toolPart.output ?? toolPart.outputText;

	return (
		<div className="mt-2 flex flex-col gap-2 pl-5">
			{input !== undefined && (
				<section className="flex flex-col gap-1">
					<h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						Input
					</h4>
					<pre className="max-h-48 overflow-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
						{formatValue(input)}
					</pre>
				</section>
			)}
			{output !== undefined && (
				<section className="flex flex-col gap-1">
					<h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						Output
					</h4>
					<pre className="max-h-48 overflow-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
						{formatValue(output)}
					</pre>
				</section>
			)}
			{toolPart.state === 'output-error' && toolPart.errorText && (
				<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
					{toolPart.errorText}
				</p>
			)}
			{toolPart.toolCallId && (
				<p className="font-mono text-[11px] text-muted-foreground">
					{toolPart.toolCallId}
				</p>
			)}
		</div>
	);
}

function Tool({ toolPart, defaultOpen = false, className, collapsible = true }: ToolProps) {
	const [isOpen, setIsOpen] = React.useState(defaultOpen);

	if (!collapsible) {
		return (
			<div className={cn('w-full', className)}>
				<div className="flex w-full items-center gap-2 text-left">
					<ToolHeader toolPart={toolPart} isOpen={false} showChevron={false} />
				</div>
				<ToolDetails toolPart={toolPart} />
			</div>
		);
	}

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('w-full', className)}>
			<CollapsibleTrigger className="group flex w-full items-center gap-2 text-left">
				<ToolHeader toolPart={toolPart} isOpen={isOpen} showChevron />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<ToolDetails toolPart={toolPart} />
			</CollapsibleContent>
		</Collapsible>
	);
}

export { Tool };
