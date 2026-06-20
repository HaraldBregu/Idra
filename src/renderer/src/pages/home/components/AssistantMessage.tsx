import { useState, type ReactElement, type ReactNode } from 'react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { Tool } from '@/components/prompt-kit/tool';
import { Button } from '@/components/ui/button';
import { Message } from '@/components/prompt-kit/message';
import { GradientSphere } from '@/components/ui/gradient-sphere';
import { cn } from '@/lib/utils';
import { type AgentMessage } from '../context';
import { markdownComponents } from './markdown';
import { statusLabel, isRunningState, stateTone } from './status';

const LONG_MESSAGE_LENGTH = 600;

function statusLabelContent(
	message: AgentMessage,
	isStreaming: boolean,
	label: string
): ReactNode {
	if (isStreaming && isRunningState(message.state)) {
		return <TextShimmer className="text-sm">{label}</TextShimmer>;
	}

	return label;
}

export function AssistantMessage({
	message,
	isStreaming = false,
	showHeader = true,
	collapseLongContent = false,
	className,
}: {
	readonly message: AgentMessage;
	readonly isStreaming?: boolean;
	readonly showHeader?: boolean;
	readonly collapseLongContent?: boolean;
	readonly className?: string;
}): ReactElement {
	const canToggleContent =
		collapseLongContent && message.content.trim().length > LONG_MESSAGE_LENGTH;
	const [isContentExpanded, setIsContentExpanded] = useState(false);

	const hasContent = message.content.length > 0;
	const hasTools = message.tools.length > 0;
	const showActivity =
		hasTools ||
		(message.state !== 'idle' && message.state !== 'completed') ||
		Boolean(message.errorText);
	const label = statusLabel(message);
	const labelContent = statusLabelContent(message, isStreaming, label);
	const statusClassName = cn(
		'inline-flex min-h-6 max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold',
		stateTone(message.state)
	);

	return (
		<Message className={cn('flex w-full flex-col', className)}>
			{hasContent && !hasTools && (
				<>
					<Markdown
						components={markdownComponents}
					>
						{message.content}
					</Markdown>
					{canToggleContent ? (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="self-start text-muted-foreground hover:text-foreground"
							aria-expanded={isContentExpanded}
							onClick={() => setIsContentExpanded((expanded) => !expanded)}
						>
							{isContentExpanded ? 'Less' : 'More'}
						</Button>
					) : null}
				</>
			)}
			{showActivity && (
				<div className="flex w-full flex-col">
					{hasTools ? (
						<div className="w-full">
							<div className="flex w-full flex-col gap-4">
								{message.tools.map((tool) => (
									<Tool
										key={tool.toolCallId}
										toolPart={tool}
										className="mt-0 w-full max-w-2xl"
									/>
								))}
							</div>
						</div>
					) : (
						<span className={statusClassName}>{labelContent}</span>
					)}
				</div>
			)}
		</Message>
	);
}
