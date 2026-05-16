import type { ReactElement } from 'react';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import type { AssistantMessage } from '../context';
import { AssistantToolActivity } from './AssistantToolActivity';
import { assistantStatusLabel, isRunningState, stateTone } from './assistant-status';

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

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-center gap-2">
				<span
					className={cn(
						'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
						stateTone(message.state)
					)}
				>
					{isStreaming && isRunningState(message.state) ? (
						<Loader variant="typing" size="sm" />
					) : (
						<span className="size-1.5 rounded-full bg-current" aria-hidden />
					)}
					{statusLabel}
				</span>
				{message.runId && (
					<span className="truncate font-mono text-[11px] text-muted-foreground">
						{message.runId}
					</span>
				)}
			</div>
			<AssistantToolActivity tools={message.tools} />
			{message.errorText && (
				<p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
					{message.errorText}
				</p>
			)}
		</div>
	);
}
