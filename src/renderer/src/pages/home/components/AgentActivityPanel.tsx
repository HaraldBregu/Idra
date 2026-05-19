import type { ReactElement, ReactNode } from 'react';
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
	const toolTriggerClassName =
		'inline-flex min-h-6 max-w-full items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground';

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full flex-col gap-1.5">
				{hasTools ? (
					<AgentToolActivity
						tools={message.tools}
						className="w-full"
						triggerClassName={toolTriggerClassName}
					/>
				) : (
					<span className={statusClassName}>
						{labelContent}
					</span>
				)}
			</div>
			{message.errorText && (
				<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
					{message.errorText}
				</p>
			)}
		</div>
	);
}
