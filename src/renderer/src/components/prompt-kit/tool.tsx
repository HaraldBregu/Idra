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

function stateIcon(state: ToolPart['state']) {
	switch (state) {
		case 'input-streaming':
			return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
		case 'input-available':
			return <Settings className="h-4 w-4 text-orange-500" />;
		case 'output-available':
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		case 'output-error':
			return <XCircle className="h-4 w-4 text-red-500" />;
	}
}

function ToolInput({ input }: { readonly input: unknown }) {
	if (!isRecord(input) || Object.keys(input).length === 0) return null;

	return (
		<div>
			<h4 className="mb-1 text-sm font-medium text-muted-foreground">Input</h4>
			<div className="rounded bg-muted/40 px-2 py-1.5 font-mono text-sm">
				{Object.entries(input).map(([key, value]) => (
					<div key={key} className="mb-1">
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
			<h4 className="mb-1 text-sm font-medium text-muted-foreground">Output</h4>
			<div className="max-h-60 overflow-auto rounded bg-muted/40 px-2 py-1.5 font-mono text-sm">
				<pre className="whitespace-pre-wrap">{formatValue(output)}</pre>
			</div>
		</div>
	);
}

function Tool({ toolPart, defaultOpen = false, className }: ToolProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const { state, toolCallId } = toolPart;
	const input = toolPart.input ?? (toolPart.inputText ? { raw: toolPart.inputText } : undefined);
	const output = toolPart.output ?? toolPart.outputText;

	return (
		<div className={cn('overflow-hidden rounded-lg', className)}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							className="h-auto w-full justify-between rounded-lg bg-background px-2 py-1.5 font-normal"
						>
							<div className="flex min-w-0 items-center gap-2">
								{stateIcon(state)}
								<span className="truncate font-mono text-sm font-medium">
									{toolPart.type}
								</span>
							</div>
							<ChevronDown className={cn('h-4 w-4', isOpen && 'rotate-180')} />
						</Button>
					}
				/>
				<CollapsibleContent
					className={cn(
						'overflow-hidden',
						'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'
					)}
				>
					<div className="space-y-2 bg-background px-2 py-1.5">
						<ToolInput input={input} />
						<ToolOutput output={output} />

						{state === 'output-error' && toolPart.errorText && (
							<div>
								<h4 className="mb-1 text-sm font-medium text-red-500">Error</h4>
								<div className="rounded bg-red-500/10 px-2 py-1.5 text-sm">
									{toolPart.errorText}
								</div>
							</div>
						)}

						{state === 'input-streaming' && (
							<div className="text-sm text-muted-foreground">Processing tool call...</div>
						)}

						{toolCallId && (
							<div className="text-xs text-muted-foreground">
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
