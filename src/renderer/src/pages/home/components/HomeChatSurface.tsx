import type { ReactElement } from 'react';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { ScrollButton } from '@/components/ui/scroll-button';
import { cn } from '@/lib/utils';
import { AssistantTextMessage } from './AssistantTextMessage';
import { Composer } from './Composer';
import { PendingMessage } from './PendingMessage';
import { ReferenceConversation } from './ReferenceConversation';
import { UserMessage } from './UserMessage';
import type { HomeChatSurfaceProps } from './types';

export function HomeChatSurface({
	messages,
	activeAssistantId,
	selectedOptions,
	pendingInputAnswers,
	input,
	isLoading,
	historyLoading,
	inputRef,
	onInputChange,
	onSubmit,
	onReset,
	onSelectApprovalOption,
	onPendingInputChange,
	onSubmitPending,
	onUseSuggestion,
	onVoiceModeRequest,
}: HomeChatSurfaceProps): ReactElement {
	const showReferenceConversation = messages.length <= 1 && !isLoading && !historyLoading;
	const canReset = messages.length > 1 || isLoading;

	return (
		<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
			<ChatContainerRoot className="min-h-0 p-0 [scrollbar-gutter:auto]" aria-live="polite">
				<ChatContainerContent
					className={cn(
						'mx-auto min-h-full w-full max-w-4xl gap-5 px-6',
						showReferenceConversation ? 'justify-start pb-6 pt-7' : 'pb-8 pt-6'
					)}
				>
					{showReferenceConversation ? (
						<ReferenceConversation onUseSuggestion={onUseSuggestion} />
					) : (
						<>
							{messages.map((message) => {
								if (message.role === 'user') {
									return <UserMessage key={message.id} content={message.content} />;
								}

								if (message.type === 'multi-select') {
									return (
										<PendingMessage
											key={message.id}
											message={message}
											selectedOptions={selectedOptions[message.id] ?? []}
											inputAnswers={pendingInputAnswers}
											onInputAnswerChange={onPendingInputChange}
											onSelectApprovalOption={onSelectApprovalOption}
											onSubmit={onSubmitPending}
										/>
									);
								}

								return (
									<AssistantTextMessage
										key={message.id}
										message={message}
										isStreaming={isLoading && message.id === activeAssistantId}
									/>
								);
							})}
						</>
					)}
					<ChatContainerScrollAnchor />
				</ChatContainerContent>
				<div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
					<ScrollButton
						type="button"
						aria-label="Scroll to latest"
						className="pointer-events-auto"
					/>
				</div>
			</ChatContainerRoot>
			<Composer
				value={input}
				isLoading={isLoading}
				canReset={canReset}
				inputRef={inputRef}
				onValueChange={onInputChange}
				onSubmit={onSubmit}
				onReset={onReset}
				onVoiceModeRequest={onVoiceModeRequest}
			/>
		</div>
	);
}
