import type { ReactElement } from 'react';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../context';
import { AssistantToolActivity } from './AssistantToolActivity';
import { assistantStatusLabel, isRunningState, stateTone } from './assistant-status';

function statusIndicator(message: AssistantMessage, isStreaming: boolean): ReactElement {
	if (isStreaming && isRunningState(message.state)) {
		return <Loader variant="typing" size="sm" />;
	}

	return <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />;
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
	const indicator = statusIndicator(message, isStreaming);
	const statusClassName = cn(
		'inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
		stateTone(message.state)
	);

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-start gap-2">
				{message.tools.length > 0 ? (
					<AssistantToolActivity
						tools={message.tools}
						label={statusLabel}
						indicator={indicator}
						className="min-w-0 flex-1"
						triggerClassName={statusClassName}
					/>
				) : (
					<span className={statusClassName}>
						{indicator}
						{statusLabel}
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
