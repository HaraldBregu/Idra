import { useState, type ReactElement } from 'react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Button } from '@/components/ui/button';
import { Message } from '@/components/ui/message';
import { cn } from '@/lib/utils';
import { getAgentSkillUsages, type AgentMessage } from '../context';
import { AssistantMessageHeader } from './AssistantMessageHeader';
import { AgentActivityPanel } from './AgentActivityPanel';
import { AgentSkillUsage } from './AgentSkillUsage';
import { markdownComponents } from './markdown';

const LONG_MESSAGE_LENGTH = 600;

export function AgentTextMessage({
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
	const skillUsages = getAgentSkillUsages(message.tools);
	const canToggleContent =
		collapseLongContent && message.content.trim().length > LONG_MESSAGE_LENGTH;
	const [isContentExpanded, setIsContentExpanded] = useState(false);

	return (
		<Message className={cn('min-w-0 w-full flex-col gap-4', className)}>
			{showHeader && (
				<AssistantMessageHeader avatarState={isStreaming ? 'active' : 'stopped'} />
			)}
			<AgentActivityPanel message={message} isStreaming={isStreaming} />
			{message.content.length > 0 && (
				<>
					<Markdown
						components={markdownComponents}
						className={cn(
							'prose min-w-0 max-w-none break-words rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed text-secondary-foreground shadow-sm [overflow-wrap:anywhere] prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs dark:prose-invert [&_*]:max-w-full [&_a]:break-words [&_a]:[overflow-wrap:anywhere] [&_code]:break-words',
							canToggleContent && !isContentExpanded && 'max-h-48 overflow-hidden'
						)}
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
			<AgentSkillUsage skills={skillUsages} className={message.content.length > 0 ? 'mt-1' : undefined} />
		</Message>
	);
}
