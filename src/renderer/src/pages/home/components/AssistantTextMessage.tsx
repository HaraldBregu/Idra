import type { ReactElement } from 'react';
import { Markdown } from '@/components/prompt-kit/markdown';
import { FeedbackBar } from '@/components/ui/feedback-bar';
import { Message } from '@/components/ui/message';
import type { AssistantMessage } from '../context';
import { AssistantActivityPanel } from './AssistantActivityPanel';
import { markdownComponents } from './markdown';

export function AssistantTextMessage({
	message,
	isStreaming = false,
}: {
	readonly message: AssistantMessage;
	readonly isStreaming?: boolean;
}): ReactElement {
	return (
		<Message className="min-w-0 max-w-2xl">
			<div className="flex min-w-0 flex-1 items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<AssistantActivityPanel message={message} isStreaming={isStreaming} />
					{message.content.length > 0 && (
						<Markdown
							components={markdownComponents}
							className="prose min-w-0 max-w-full break-words rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm [overflow-wrap:anywhere] prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-sm prose-h6:text-xs dark:prose-invert [&_*]:max-w-full [&_a]:break-words [&_a]:[overflow-wrap:anywhere] [&_code]:break-words"
						>
							{message.content}
						</Markdown>
					)}
					{message.content.length > 0 && (
						<FeedbackBar className="max-w-xl bg-background/80 px-0 text-xs shadow-sm" />
					)}
				</div>
			</div>
		</Message>
	);
}
