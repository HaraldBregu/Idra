'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
	status?: 'ok' | 'error' | 'blocked' | 'rejected';
	displayName?: string;
	serviceKind?: string;
	serviceId?: string;
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
	label?: string;
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

function ToolInput({ input }: { readonly input: unknown }) {
	if (!isRecord(input) || Object.keys(input).length === 0) return null;

	return (
		<div>
			<h4 className="mb-0.5 text-xs font-medium text-muted-foreground">Input</h4>
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
			<h4 className="mb-0.5 text-xs font-medium text-muted-foreground">Output</h4>
			<div className="max-h-60 overflow-auto rounded bg-muted/30 px-1.5 py-1 font-mono text-xs text-muted-foreground">
				<pre className="whitespace-pre-wrap">{formatValue(output)}</pre>
			</div>
		</div>
	);
}

function Tool({ toolPart, label, defaultOpen = false, className }: ToolProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const { state, toolCallId } = toolPart;
	const input = toolPart.input ?? (toolPart.inputText ? { raw: toolPart.inputText } : undefined);
	const output = toolPart.output ?? toolPart.outputText;
	const triggerLabel = label ?? toolPart.type;

	return (
		<div className={cn('overflow-hidden rounded-md', className)}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							className="p-0! h-auto w-full justify-start rounded-md bg-transparent! py-1 font-normal text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
						>
							<div className="flex min-w-0 items-center gap-1.5">
								<span
									className={cn(
										'truncate text-sm font-medium',
										label ? 'font-sans' : 'font-mono capitalize'
									)}
								>
									{triggerLabel}
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
					<div className="space-y-1.5 bg-background px-1.5 py-1">
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
							<div className="text-xs text-muted-foreground">Processing tool call...</div>
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
