import type { ReactElement } from 'react';
import { useNow } from '@/components/hooks/use-now';
import { formatDuration } from '@/components/prompt-kit/duration';
import { estimateTokens } from '@/components/prompt-kit/tokens';
import { cn } from '@/lib/utils';
import type { AgentMessage } from '../context';
import { isRunningState } from './status';

export function MessageStats({
	message,
	isStreaming,
	className,
}: {
	readonly message: AgentMessage;
	readonly isStreaming: boolean;
	readonly className?: string;
}): ReactElement | null {
	const isRunning = isStreaming && isRunningState(message.state);
	const now = useNow(isRunning && message.startedAtMs !== undefined);

	const elapsedMs = isRunning
		? message.startedAtMs !== undefined
			? Math.max(0, now - message.startedAtMs)
			: undefined
		: message.startedAtMs !== undefined && message.completedAtMs !== undefined
			? Math.max(0, message.completedAtMs - message.startedAtMs)
			: undefined;

	const settledTokens = message.settledOutputTokens ?? 0;
	const estimatedTokens = estimateTokens(message.streamedChars ?? 0);
	const liveTokens = settledTokens + estimatedTokens;
	const finalTokens =
		message.outputTokens ?? (settledTokens > 0 ? settledTokens : undefined);
	const tokens = isRunning ? (liveTokens > 0 ? liveTokens : undefined) : finalTokens;
	const isEstimate = isRunning && estimatedTokens > 0;

	if (elapsedMs === undefined && tokens === undefined) return null;

	return (
		<div
			className={cn(
				'flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground/50',
				className
			)}
			aria-live="off"
		>
			{elapsedMs !== undefined && <span>{formatDuration(elapsedMs)}</span>}
			{tokens !== undefined && (
				<span>
					{isEstimate ? '~' : ''}
					{tokens.toLocaleString()} tok
				</span>
			)}
		</div>
	);
}
