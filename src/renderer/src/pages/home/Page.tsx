import type { ReactElement } from 'react';
import { PageContainer } from '@/components/app/base/page';
import {
	ChatContainerContent,
	ChatContainerRoot,
	ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { ScrollButton } from '@/components/ui/scroll-button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import { AssistantTextMessage } from './components/AssistantTextMessage';
import { Composer } from './components/Composer';
import { PendingMessage } from './components/PendingMessage';
import { ReferenceConversation } from './components/ReferenceConversation';
import { UserMessage } from './components/UserMessage';
import { Provider } from './context';
import { useHomeAssistant } from './hooks';

function PageContent(): ReactElement {
	const { setMode } = useChatMode();
	const assistant = useHomeAssistant({ setMode });
	const showReferenceConversation =
		assistant.chatState.messages.length <= 1 &&
		!assistant.isLoading &&
		!assistant.historyLoading;
	const canReset = assistant.chatState.messages.length > 1 || assistant.isLoading;

	return (
		<PageContainer className="overflow-hidden text-foreground">
			<div className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground">
				<ChatContainerRoot className="min-h-0 p-0 [scrollbar-gutter:auto]" aria-live="polite">
					<ChatContainerContent
						className={cn(
							'mx-auto min-h-full w-full max-w-4xl gap-5 px-6',
							showReferenceConversation ? 'justify-start pb-6 pt-7' : 'pb-8 pt-6'
						)}
					>
						{showReferenceConversation ? (
							<ReferenceConversation onUseSuggestion={assistant.useSuggestion} />
						) : (
							<>
								{assistant.chatState.messages.map((message) => {
									if (message.role === 'user') {
										return <UserMessage key={message.id} content={message.content} />;
									}

									if (message.type === 'multi-select') {
										return (
											<PendingMessage
												key={message.id}
												message={message}
												selectedOptions={assistant.selectedOptions[message.id] ?? []}
												inputAnswers={assistant.pendingInputAnswers}
												onInputAnswerChange={assistant.updatePendingInputAnswer}
												onSelectApprovalOption={assistant.selectApprovalOption}
												onSubmit={(pendingMessage) =>
													void assistant.submitMultiSelect(pendingMessage)
												}
											/>
										);
									}

									return (
										<AssistantTextMessage
											key={message.id}
											message={message}
											isStreaming={
												assistant.isLoading &&
												message.id === assistant.chatState.activeAssistantId
											}
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
					value={assistant.input}
					isLoading={assistant.isLoading}
					canReset={canReset}
					inputRef={assistant.inputRef}
					onValueChange={assistant.setInput}
					onSubmit={assistant.handleSubmit}
					onReset={assistant.resetChat}
					onVoiceModeRequest={() => setMode('voice')}
				/>
			</div>
		</PageContainer>
	);
}

function Page(): ReactElement {
	return (
		<Provider>
			<PageContent />
		</Provider>
	);
}

export default Page;
