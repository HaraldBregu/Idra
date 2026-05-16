import type { ReactElement } from 'react';
import { Message, MessageContent } from '@/components/ui/message';

export function UserMessage({ content }: { readonly content: string }): ReactElement {
	return (
		<Message className="justify-end">
			<MessageContent className="min-w-0 max-w-[30.6rem] break-words rounded-3xl bg-primary px-5 py-3 text-sm font-medium leading-relaxed text-primary-foreground [overflow-wrap:anywhere]">
				{content}
			</MessageContent>
		</Message>
	);
}
