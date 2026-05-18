import type { ReactElement } from 'react';
import { Message, MessageContent } from '@/components/ui/message';

export function UserMessage({ content }: { readonly content: string }): ReactElement {
	return (
		<Message className="w-full justify-end">
			<MessageContent className="min-w-0 w-fit max-w-[30.6rem] break-words rounded-xl bg-primary px-5 py-3 text-sm font-medium leading-relaxed text-primary-foreground [overflow-wrap:anywhere]">
				{content}
			</MessageContent>
		</Message>
	);
}
