'use client';

import { useState } from 'react';
import { CheckCircle, ChevronDown, Loader2, Settings, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type ToolPart = {
	type: string;
	displayName?: string;
	serviceKind?: 'tool' | 'connector' | 'mcp';
	serviceId?: string;
	state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
	status?: 'ok' | 'error' | 'blocked' | 'rejected';
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
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	if (typeof value === 'object') return JSON.stringify(value, null, 2);
	return String(value);
}

function parseJsonText(value: string | undefined): unknown | undefined {
	if (!value?.trim()) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

function displayValue(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	const parsed = parseJsonText(value);
	return parsed ?? value;
}

function humanizeToolName(value: string): string {
	return value
		.replace(/^mcp__/, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (match) => match.toUpperCase());
}

function serviceKindLabel(kind: ToolPart['serviceKind']): string | undefined {
	if (kind === 'connector') return 'Connector';
	if (kind === 'mcp') return 'MCP';
	if (kind === 'tool') return 'Tool';
	return undefined;
}

function stateLabel(toolPart: ToolPart): string {
	if (toolPart.status === 'blocked') return 'Blocked';
	if (toolPart.status === 'rejected') return 'Rejected';
	if (toolPart.state === 'output-error') return 'Failed';
	if (toolPart.state === 'output-available') return 'Done';
	if (toolPart.state === 'input-available') return 'Ready';
	return 'Running';
}

function formatDuration(durationMs: number | undefined): string | undefined {
	if (durationMs === undefined) return undefined;
	if (durationMs < 1000) return `${durationMs} ms`;
	return `${(durationMs / 1000).toFixed(1)} s`;
}

function stateIcon(state: ToolPart['state']) {
	switch (state) {
		case 'input-streaming':
			return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />;
		case 'input-available':
			return <Settings className="size-3.5 text-muted-foreground" />;
		case 'output-available':
			return <CheckCircle className="size-3.5 text-muted-foreground" />;
		case 'output-error':
			return <XCircle className="size-3.5 text-muted-foreground" />;
	}
}

function ToolInput({ input }: { readonly input: unknown }) {
	if (!isRecord(input) || Object.keys(input).length === 0) return null;

	return (
		<div>
			<h4 className="mb-0.5 text-xs font-medium text-muted-foreground">Arguments</h4>
			<div className="rounded bg-muted/30 px-1.5 py-1 font-mono text-xs text-muted-foreground">
				{Object.entries(input).map(([key, value]) => (
					<div key={key} className="mb-0.5">
						<span className="text-muted-foreground">{key}:</span>{' '}
						<span>{formatValue(value)}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function ToolOutput({ output }: { readonly output: unknown }) {
	if (output === undefined) return null;

	return (
		<div>
			<h4 className="mb-0.5 text-xs font-medium text-muted-foreground">Result</h4>
			<div className="max-h-60 overflow-auto rounded bg-muted/30 px-1.5 py-1 font-mono text-xs text-muted-foreground">
				<pre className="whitespace-pre-wrap">{formatValue(output)}</pre>
			</div>
		</div>
	);
}

function Tool({ toolPart, defaultOpen = false, className }: ToolProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const { state, toolCallId } = toolPart;
	const input =
		toolPart.input ??
		parseJsonText(toolPart.inputText) ??
		(toolPart.inputText ? { raw: toolPart.inputText } : undefined);
	const output = displayValue(toolPart.output ?? toolPart.outputText);
	const title = toolPart.displayName?.trim() || humanizeToolName(toolPart.type);
	const kindLabel = serviceKindLabel(toolPart.serviceKind);
	const duration = formatDuration(toolPart.durationMs);

	return (
		<div className={cn('overflow-hidden rounded-md border border-border/70 bg-background', className)}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							className="h-auto w-full justify-between rounded-md px-2 py-1.5 font-normal text-muted-foreground"
							title={toolPart.serviceId ? `${title} (${toolPart.serviceId})` : title}
						>
							<div className="flex min-w-0 items-center gap-2">
								{stateIcon(state)}
								<span className="truncate text-xs font-medium text-foreground">
									{title}
								</span>
								{kindLabel ? (
									<span className="shrink-0 rounded border border-border/70 px-1 py-0 text-[10px] leading-4">
										{kindLabel}
									</span>
								) : null}
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<span className="text-[11px] text-muted-foreground">
									{duration ? `${stateLabel(toolPart)} · ${duration}` : stateLabel(toolPart)}
								</span>
								<ChevronDown className={cn('size-3.5', isOpen && 'rotate-180')} />
							</div>
						</Button>
					}
				/>
				<CollapsibleContent
					className={cn(
						'overflow-hidden',
						'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'
					)}
				>
					<div className="space-y-1.5 bg-background px-2 pb-2 pt-1">
						<ToolInput input={input} />
						<ToolOutput output={output} />

						{state === 'output-error' && toolPart.errorText && (
							<div>
								<h4 className="mb-0.5 text-xs font-medium text-muted-foreground">Error</h4>
								<div className="rounded bg-muted/30 px-1.5 py-1 text-xs text-muted-foreground">
									{toolPart.errorText}
								</div>
							</div>
						)}

						{state === 'input-streaming' && (
							<div className="text-xs text-muted-foreground">Preparing tool call...</div>
						)}

						{toolCallId && (
							<div className="text-[11px] text-muted-foreground">
								<span className="font-mono">Call ID: {toolCallId}</span>
							</div>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

export { Tool };
