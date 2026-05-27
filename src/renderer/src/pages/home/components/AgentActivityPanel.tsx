import type { ReactElement, ReactNode } from 'react';
import { Brain } from 'lucide-react';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { cn } from '@/lib/utils';
import type { AgentMessage } from '../context';
import { AgentToolActivity } from './AgentToolActivity';
import { agentStatusLabel, isRunningState, stateTone } from './agent-status';

function statusLabelContent(
	message: AgentMessage,
	isStreaming: boolean,
	statusLabel: string
): ReactNode {
	if (isStreaming && isRunningState(message.state)) {
		return <TextShimmer className="text-sm">{statusLabel}</TextShimmer>;
	}

	return statusLabel;
}

function AgentReasoningSummaries({
	message,
}: {
	readonly message: AgentMessage;
}): ReactElement | null {
	const summaries = message.reasoning ?? [];
	if (summaries.length === 0) return null;
	const latest = summaries[summaries.length - 1];
	if (!latest) return null;

	return (
		<div className="flex max-w-2xl items-start gap-2 rounded-md border border-border/70 bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
			<Brain className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
			<div className="min-w-0">
				<div className="font-medium text-foreground">{latest.title}</div>
				<div className="break-words leading-relaxed">{latest.summary}</div>
			</div>
		</div>
	);
}

export function AgentActivityPanel({
	message,
	isStreaming,
}: {
	readonly message: AgentMessage;
	readonly isStreaming: boolean;
}): ReactElement | null {
	const hasTools = message.tools.length > 0;
	const showActivity =
		hasTools ||
		(message.state !== 'idle' && message.state !== 'completed') ||
		Boolean(message.errorText);

	if (!showActivity) return null;
	const statusLabel = agentStatusLabel(message);
	const labelContent = statusLabelContent(message, isStreaming, statusLabel);
	const statusClassName = cn(
		'inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold',
		stateTone(message.state)
	);

	return (
		<div className="flex w-full flex-col gap-2">
			<span className={statusClassName}>
				{labelContent}
			</span>
			{hasTools && (
				<AgentToolActivity
					tools={message.tools}
					className="w-full"
				/>
			)}
			<AgentReasoningSummaries message={message} />
			{message.errorText && (
				<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
					{message.errorText}
				</p>
			)}
		</div>
	);
}
