import type { ReactElement, ReactNode } from 'react';
import { CheckCircle, ListChecks, Loader2, Settings, XCircle } from 'lucide-react';
import { Steps, StepsContent, StepsItem, StepsTrigger } from '@/components/ui/steps';
import { cn } from '@/lib/utils';
import type { AgentToolPart } from '../context';

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

function toolStateMeta(tool: AgentToolPart): {
	readonly label: string;
	readonly icon: ReactNode;
	readonly className: string;
} {
	switch (tool.state) {
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
				label: tool.status === 'rejected' ? 'Denied' : 'Error',
				icon: <XCircle className="size-3.5" />,
				className: 'text-destructive',
			};
	}
}

function ToolValueSection({
	title,
	value,
}: {
	readonly title: string;
	readonly value: unknown;
}): ReactElement {
	return (
		<section className="flex flex-col gap-1">
			<h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{title}
			</h4>
			<pre className="max-h-48 overflow-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
				{formatValue(value)}
			</pre>
		</section>
	);
}

function ToolStep({ tool }: { readonly tool: AgentToolPart }): ReactElement {
	const meta = toolStateMeta(tool);
	const input = tool.input ?? tool.inputText;
	const output = tool.output ?? tool.outputText;
	const details = [
		meta.label,
		tool.iteration !== undefined ? `Iteration ${tool.iteration + 1}` : undefined,
		tool.durationMs !== undefined ? formatDuration(tool.durationMs) : undefined,
	].filter(Boolean);

	return (
		<StepsItem>
			<span className={cn('mt-0.5 shrink-0 transition-colors', meta.className)}>
				{meta.icon}
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-sm font-medium text-foreground">{tool.type}</span>
					{details.length > 0 && (
						<span className="truncate text-[11px] text-muted-foreground">
							{details.join(' · ')}
						</span>
					)}
				</div>
				<div className="mt-2 flex flex-col gap-2">
					{input !== undefined && <ToolValueSection title="Input" value={input} />}
					{output !== undefined && <ToolValueSection title="Output" value={output} />}
					{tool.state === 'output-error' && tool.errorText && (
						<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
							{tool.errorText}
						</p>
					)}
					<p className="font-mono text-[11px] text-muted-foreground">
						{tool.toolCallId}
					</p>
				</div>
			</div>
		</StepsItem>
	);
}

export function AgentToolActivity({
	tools,
	label,
	indicator,
	className,
	triggerClassName,
	defaultOpen = false,
}: {
	readonly tools: readonly AgentToolPart[];
	readonly label?: ReactNode;
	readonly indicator?: ReactNode;
	readonly className?: string;
	readonly triggerClassName?: string;
	readonly defaultOpen?: boolean;
}): ReactElement | null {
	if (tools.length === 0) return null;
	const fallbackLabel = 'Tasks';
	const triggerIcon =
		indicator === undefined ? <ListChecks className="size-3.5 shrink-0" /> : indicator;

	return (
		<Steps defaultOpen={defaultOpen} className={className}>
			<StepsTrigger
				className={triggerClassName}
				leftIcon={triggerIcon}
				swapIconOnHover={false}
			>
				<span className="truncate">{label ?? fallbackLabel}</span>
			</StepsTrigger>
			<StepsContent>
				{tools.map((tool) => (
					<ToolStep key={tool.toolCallId} tool={tool} />
				))}
			</StepsContent>
		</Steps>
	);
}
