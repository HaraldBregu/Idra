import type { ReactElement, ReactNode } from 'react';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { cn } from '@/lib/utils';
import type { AgentMessage } from '../context';
import { ToolActivity } from './ToolActivity';
import { statusLabel, isRunningState, stateTone } from './status';

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
	className,
}: {
	readonly message: AgentMessage;
	readonly isStreaming: boolean;
	readonly className?: string;
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
		<div className={cn('flex w-full flex-col', className)}>
			<div className="flex w-full flex-col">
				{hasTools ? (
					<AgentToolActivity
						tools={message.tools}
						className="w-full"
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
