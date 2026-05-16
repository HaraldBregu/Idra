import type { ReactElement } from 'react';
import { PageContainer } from '@/components/app/base/page';
import { useChatMode } from '@/contexts/chat-mode';
import { Provider } from './context';
import { HomeChatSurface } from './components';
import { useHomeAssistant } from './hooks';

function PageContent(): ReactElement {
	const { setMode } = useChatMode();
	const assistant = useHomeAssistant({ setMode });

	return (
		<PageContainer className="overflow-hidden text-foreground">
			<HomeChatSurface
				messages={assistant.chatState.messages}
				activeAssistantId={assistant.chatState.activeAssistantId}
				selectedOptions={assistant.selectedOptions}
				pendingInputAnswers={assistant.pendingInputAnswers}
				input={assistant.input}
				isLoading={assistant.isLoading}
				historyLoading={assistant.historyLoading}
				inputRef={assistant.inputRef}
				onInputChange={assistant.setInput}
				onSubmit={assistant.handleSubmit}
				onReset={assistant.resetChat}
				onSelectApprovalOption={assistant.selectApprovalOption}
				onPendingInputChange={assistant.updatePendingInputAnswer}
				onSubmitPending={(message) => void assistant.submitMultiSelect(message)}
				onUseSuggestion={assistant.useSuggestion}
				onVoiceModeRequest={() => setMode('voice')}
			/>
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
