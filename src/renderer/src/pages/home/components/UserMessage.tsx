import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Message, MessageContent } from '@/components/ui/message';
import { cn } from '@/lib/utils';

const LONG_MESSAGE_LENGTH = 600;

export function UserMessage({
	content,
	collapseLongContent = false,
}: {
	readonly content: string;
	readonly collapseLongContent?: boolean;
}): ReactElement {
	const canToggleContent = collapseLongContent && content.trim().length > LONG_MESSAGE_LENGTH;
	const [isContentExpanded, setIsContentExpanded] = useState(false);

	return (
		<Message className="w-full justify-end">
			<div className="flex min-w-0 max-w-[75%] flex-col items-end gap-1">
				<MessageContent
					className={cn(
						'min-w-0 w-fit max-w-full break-words rounded-xl bg-primary px-5 py-3 text-sm font-medium leading-relaxed text-primary-foreground [overflow-wrap:anywhere]',
						canToggleContent && !isContentExpanded && 'max-h-40 overflow-hidden'
					)}
				>
					{content}
				</MessageContent>
				{canToggleContent ? (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="text-muted-foreground hover:text-foreground"
						aria-expanded={isContentExpanded}
						onClick={() => setIsContentExpanded((expanded) => !expanded)}
					>
						{isContentExpanded ? 'Less' : 'More'}
					</Button>
				) : null}
			</div>
		</Message>
	);
}
