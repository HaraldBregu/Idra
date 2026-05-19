import type { ReactElement } from 'react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { Message } from '@/components/ui/message';
import type { AgentMessage } from '../context';
import { AgentActivityPanel } from './AgentActivityPanel';
import { AssistantLogo } from './AssistantLogo';
import { markdownComponents } from './markdown';

export function AgentTextMessage({
	message,
	isStreaming = false,
	isFirstInRun = true,
}: {
	readonly message: AgentMessage;
	readonly isStreaming?: boolean;
	readonly isFirstInRun?: boolean;
}): ReactElement {
	return (
		<Message className="min-w-0 w-full flex-col gap-2">
			{isFirstInRun && <AssistantLogo />}
			<div className="flex min-w-0 w-full flex-col gap-2">
				<AgentActivityPanel message={message} isStreaming={isStreaming} />
				{message.content.length > 0 && (
					<Markdown
						components={markdownComponents}
						className="prose min-w-0 max-w-none break-words rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed text-secondary-foreground shadow-sm [overflow-wrap:anywhere] prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs dark:prose-invert [&_*]:max-w-full [&_a]:break-words [&_a]:[overflow-wrap:anywhere] [&_code]:break-words"
					>
						{message.content}
					</Markdown>
				)}
			</div>
		</Message>
	);
}
