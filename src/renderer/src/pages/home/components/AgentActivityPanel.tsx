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
	const showActivity =
		message.state !== 'idle' ||
		message.tools.length > 0 ||
		Boolean(message.errorText);

	if (!showActivity) return null;
	const statusLabel = agentStatusLabel(message);
	const labelContent = statusLabelContent(message, isStreaming, statusLabel);
	const statusClassName = cn(
		'inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold',
		stateTone(message.state)
	);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex w-full flex-col gap-1.5">
				{message.tools.length > 0 ? (
					<AgentToolActivity
						tools={message.tools}
						label={labelContent}
						indicator={null}
						className="w-full"
						triggerClassName={statusClassName}
					/>
				) : (
					<span className={statusClassName}>
						{labelContent}
					</span>
				)}
				{message.runId && (
					<span className="truncate font-mono text-[11px] text-muted-foreground">
						{message.runId}
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
