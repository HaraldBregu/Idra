import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
	PromptInput,
	PromptInputActions,
	PromptInputTextarea,
	PromptInputVoiceActions,
} from '../../../../../src/renderer/src/components/ui/prompt-input';

jest.mock('motion/react', () => ({
	AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
	motion: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
	},
	useReducedMotion: () => true,
}));

jest.mock('@/components/ui/bar-wave-animation', () => ({
	BarWaveAnimation: () => <div data-testid="bar-wave" />,
}));

jest.mock('@/components/ui/wave-animation', () => ({
	WaveAnimation: () => <div data-testid="wave" />,
}));

describe('PromptInput', () => {
	it('keeps dictated text visible in the prompt while dictation controls are shown', () => {
		render(
			<PromptInput
				value="spoken words"
				onValueChange={jest.fn()}
				leadingAction={<button type="button">Attach</button>}
				actions={<button type="button">Send</button>}
				voiceMode="dictation"
				voiceElapsedMs={1_250}
				onVoiceCancel={jest.fn()}
				onVoiceConfirm={jest.fn()}
			>
				<PromptInputTextarea aria-label="Message Friday" />
			</PromptInput>
		);

		expect(screen.getByRole('textbox', { name: 'Message Friday' })).toHaveValue(
			'spoken words'
		);
		expect(screen.getByRole('button', { name: 'Cancel dictation' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Confirm dictation' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
	});

	it('hides the prompt while batch speech-to-text recording controls are shown', () => {
		render(
			<PromptInput
				value="existing prompt"
				onValueChange={jest.fn()}
				leadingAction={<button type="button">Attach</button>}
				actions={<button type="button">Send</button>}
				voiceMode="recording"
				voiceElapsedMs={1_250}
				onVoiceCancel={jest.fn()}
				onVoiceConfirm={jest.fn()}
			>
				<PromptInputTextarea aria-label="Message Friday" />
			</PromptInput>
		);

		expect(screen.queryByRole('textbox', { name: 'Message Friday' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Cancel recording' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Confirm recording' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
	});

	it('renders separate speech-to-text and disabled voice conversation actions', () => {
		const onSpeechToText = jest.fn();
		const onVoiceConversation = jest.fn();

		render(
			<PromptInput
				value=""
				onValueChange={jest.fn()}
				leadingAction={<button type="button">Attach</button>}
				actions={
					<PromptInputActions>
						<PromptInputVoiceActions
							speechToTextMode="record"
							onSpeechToText={onSpeechToText}
							onVoiceConversation={onVoiceConversation}
							voiceConversationDisabled
						/>
					</PromptInputActions>
				}
			>
				<PromptInputTextarea aria-label="Message Friday" />
			</PromptInput>
		);

		const speechToTextButton = screen.getByRole('button', { name: 'Record speech to text' });
		const voiceConversationButton = screen.getByRole('button', {
			name: 'Start voice conversation',
		});

		expect(speechToTextButton).toBeEnabled();
		expect(voiceConversationButton).toBeDisabled();

		fireEvent.click(speechToTextButton);
		fireEvent.click(voiceConversationButton);

		expect(onSpeechToText).toHaveBeenCalledTimes(1);
		expect(onVoiceConversation).not.toHaveBeenCalled();
	});
});
