import type { ReactElement, ReactNode } from 'react';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../context';
import { AssistantToolActivity } from './AssistantToolActivity';
import { assistantStatusLabel, isRunningState, stateTone } from './assistant-status';

function statusLabelContent(
	message: AssistantMessage,
	isStreaming: boolean,
	statusLabel: string
): ReactNode {
	if (isStreaming && isRunningState(message.state)) {
		return <TextShimmer className="text-sm">{statusLabel}</TextShimmer>;
	}

	return statusLabel;
}

export function AssistantActivityPanel({
	message,
	isStreaming,
}: {
	readonly message: AssistantMessage;
	readonly isStreaming: boolean;
}): ReactElement | null {
	const showActivity =
		message.state !== 'idle' ||
		message.tools.length > 0 ||
		Boolean(message.errorText);

	if (!showActivity) return null;
	const statusLabel = assistantStatusLabel(message);
	const labelContent = statusLabelContent(message, isStreaming, statusLabel);
	const statusClassName = cn(
		'inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold',
		stateTone(message.state)
	);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-start gap-2">
				{message.tools.length > 0 ? (
					<AssistantToolActivity
						tools={message.tools}
						label={labelContent}
						indicator={null}
						className="min-w-0 flex-1"
						triggerClassName={statusClassName}
					/>
				) : (
					<span className={statusClassName}>
						{labelContent}
					</span>
				)}
				{message.runId && (
					<span className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
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
